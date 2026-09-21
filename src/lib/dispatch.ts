/**
 * dispatch.ts — durable, resumable campaign dispatch.
 *
 * WHY THIS EXISTS
 * ---------------
 * The previous implementation kicked off Batch 1 as a floating promise
 * (`executeBatch1BackgroundDispatch(...)` with no `await`) and returned the HTTP
 * response immediately. On Vercel the function instance is frozen the moment the
 * response is flushed, so that promise was discarded *before* it ever reached
 * `resend.batch.send`. Result: the UI said "sending…", Resend saw no request at
 * all, and the rows sat in `status: "sending"` until a scheduler tick self-healed
 * them back to "scheduled" minutes later.
 *
 * The model here is a queue, not a background job:
 *   1. Recipients are rows in a queue (`CampaignRecipient`).
 *   2. A worker atomically CLAIMS a bounded slice (one Resend batch call = 100).
 *   3. It sends that slice and persists the outcome in BULK (3 queries, not 2xN).
 *   4. It repeats until the queue drains or its time budget runs out.
 *   5. Whatever is left is still `scheduled`, so the next invocation — the next
 *      user request, or the cron tick — picks up exactly where this one stopped.
 *
 * Nothing is ever "in flight" outside a request that is awaiting it, so there is
 * no work to lose when the instance dies.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveProduct, type ResolvedProduct } from "@/lib/product-resolver";
import { renderAndSendBatch } from "@/lib/email-engine";
import {
  RESEND_BATCH_LIMIT,
  CHUNK_INTERVAL_MS,
  isDeliverableEmail,
} from "@/lib/mail-action/shared";

/** One slice == one Resend `batch.send` call. */
export const SLICE_SIZE = RESEND_BATCH_LIMIT;

/**
 * Wall-clock budget for a single invocation. Routes declare `maxDuration = 60`,
 * so we stop at 45s and leave headroom to persist results and respond.
 */
export const DEFAULT_BUDGET_MS = 45_000;

/**
 * A row stuck in "sending" with no Resend id for longer than this is assumed to
 * belong to a dead invocation and is safe to re-claim. Must be comfortably
 * larger than `maxDuration` so we never re-claim a slice that is genuinely
 * mid-flight in a concurrent request.
 */
export const STALE_SENDING_MS = 3 * 60 * 1000;

/**
 * How many times a row may be claimed without us ever learning the outcome
 * before we stop re-sending it and quarantine it instead.
 *
 * A worker that vanishes usually dies *before* the Resend call, so one retry is
 * worth taking. Past that we cannot tell "never sent" from "sent, but the reply
 * was lost", and re-sending risks a duplicate — so the row becomes
 * "needs_review" and a human decides. Resend has no idempotency key on SDK v3,
 * which is the only thing that could make this decision for us.
 */
export const MAX_AMBIGUOUS_ATTEMPTS = 2;

/** Statuses that mean "this recipient is done, never touch it again". */
const TERMINAL_STATUSES = [
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "suppressed",
  "cancelled",
];

type ClaimedRecipient = {
  id: string;
  email: string;
  firstName: string | null;
};

export interface DispatchOptions {
  /** Wall-clock budget in ms. Defaults to {@link DEFAULT_BUDGET_MS}. */
  budgetMs?: number;
  /**
   * Also re-claim rows the circuit breaker previously marked "failed".
   * Only manual retries should set this — otherwise the scheduler would retry
   * permanently-failing batches forever and the breaker would never hold.
   */
  includeFailed?: boolean;
}

export interface DispatchOutcome {
  sent: number;
  failed: number;
  /** Recipients in this batch still awaiting dispatch when we stopped. */
  remaining: number;
  /** True when we stopped because the time budget ran out, not because we drained. */
  timedOut: boolean;
  slices: number;
  ids: { resendEmailId: string; email: string }[];
  errors: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Claiming
// ---------------------------------------------------------------------------

/**
 * Atomically move up to `limit` eligible recipients into "sending" and return
 * them. `FOR UPDATE SKIP LOCKED` means two concurrent workers (a user request
 * and a cron tick, say) each get a disjoint slice instead of both grabbing the
 * same rows — which is how the old read-then-write claim produced double sends.
 */
async function claimSlice(
  campaignId: string,
  batchNumber: number,
  limit: number,
): Promise<ClaimedRecipient[]> {
  const staleCutoff = new Date(Date.now() - STALE_SENDING_MS);

  const rows = await prisma.$queryRaw<ClaimedRecipient[]>`
    UPDATE "CampaignRecipient" AS cr
    SET status = 'sending',
        "updatedAt" = NOW(),
        "attemptCount" = cr."attemptCount" + 1,
        "lastAttemptAt" = NOW()
    WHERE cr.id IN (
      SELECT r.id
      FROM "CampaignRecipient" r
      WHERE r."campaignId" = ${campaignId}
        AND r."batchNumber" = ${batchNumber}
        AND r."resendEmailId" IS NULL
        AND (
          r.status IN ('pending', 'scheduled')
          OR (r.status = 'sending' AND r."updatedAt" < ${staleCutoff})
        )
        AND r."attemptCount" < ${MAX_AMBIGUOUS_ATTEMPTS}
      ORDER BY r."createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    RETURNING cr.id, cr.email, cr."firstName" AS "firstName";
  `;

  return rows;
}

/**
 * Hand a claimed slice back to the queue.
 *
 * Only call this when Resend definitively did not accept the emails — the call
 * threw, or came back with zero ids. Because we know nothing was sent, the
 * attempt is rolled back too, so a run of transient network errors can't burn
 * through the retry budget and quarantine recipients that were never emailed.
 */
async function releaseSlice(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.campaignRecipient.updateMany({
    where: { id: { in: ids }, resendEmailId: null },
    data: { status: "scheduled", attemptCount: { decrement: 1 } },
  });
}

/**
 * Park rows whose outcome we can no longer determine.
 *
 * These were claimed, the worker died, and enough time has passed that it is not
 * coming back. We do not know whether Resend accepted them, so we refuse to
 * guess: they surface in the dashboard for a human to either send or write off.
 */
export async function quarantineAmbiguousRecipients(): Promise<number> {
  const staleCutoff = new Date(Date.now() - STALE_SENDING_MS);
  const result = await prisma.campaignRecipient.updateMany({
    where: {
      status: "sending",
      resendEmailId: null,
      updatedAt: { lte: staleCutoff },
      attemptCount: { gte: MAX_AMBIGUOUS_ATTEMPTS },
    },
    data: {
      status: "needs_review",
      bounceReason:
        "Dispatch outcome unknown — the worker stopped between the Resend call and " +
        "recording the result. Not re-sent automatically to avoid a duplicate.",
    },
  });
  return result.count;
}

// ---------------------------------------------------------------------------
// Persisting a slice's outcome
// ---------------------------------------------------------------------------

/**
 * Write the result of one slice back to the DB in a fixed number of queries.
 *
 * The old code ran one `updateMany` per recipient plus one `contact.update` per
 * recipient — 400+ sequential round-trips to Neon for a 200-person batch, which
 * is most of why a send that did run took minutes. This is 3 queries regardless
 * of slice size.
 */
async function persistSliceOutcome(
  campaignId: string,
  claimed: ClaimedRecipient[],
  ids: { resendEmailId: string; email: string }[],
): Promise<{ sentCount: number; failedCount: number }> {
  const idByEmail = new Map(ids.map((i) => [i.email.toLowerCase(), i.resendEmailId]));

  const sentRows: { id: string; email: string; resendEmailId: string }[] = [];
  const failedIds: string[] = [];

  for (const r of claimed) {
    const resendId = idByEmail.get(r.email.toLowerCase());
    if (resendId) {
      sentRows.push({ id: r.id, email: r.email, resendEmailId: resendId });
    } else {
      failedIds.push(r.id);
    }
  }

  if (sentRows.length > 0) {
    // Single UPDATE ... FROM (VALUES ...) so every row gets its own Resend id.
    const values = Prisma.join(
      sentRows.map((r) => Prisma.sql`(${r.id}, ${r.resendEmailId})`),
    );
    await prisma.$executeRaw`
      UPDATE "CampaignRecipient" AS cr
      SET status = 'sent',
          "sentAt" = NOW(),
          "updatedAt" = NOW(),
          "resendEmailId" = v.rid::text
      FROM (VALUES ${values}) AS v(id, rid)
      WHERE cr.id = v.id::text
    `;

    await prisma.contact.updateMany({
      where: { email: { in: sentRows.map((r) => r.email) } },
      data: { totalSent: { increment: 1 }, lastSentAt: new Date() },
    });
  }

  if (failedIds.length > 0) {
    await prisma.campaignRecipient.updateMany({
      where: { id: { in: failedIds }, resendEmailId: null },
      data: { status: "failed" },
    });
  }

  return { sentCount: sentRows.length, failedCount: failedIds.length };
}

// ---------------------------------------------------------------------------
// Campaign roll-up
// ---------------------------------------------------------------------------

async function countRemainingInBatch(campaignId: string, batchNumber: number) {
  return prisma.campaignRecipient.count({
    where: {
      campaignId,
      batchNumber,
      resendEmailId: null,
      status: { in: ["pending", "scheduled", "sending"] },
    },
  });
}

/**
 * Recompute `Campaign.sentCount` / `status` from the recipient rows.
 *
 * Derived rather than incremented: an increment is wrong the moment a retry or
 * a concurrent slice touches the same campaign, and this is cheap.
 */
async function reconcileCampaign(campaignId: string): Promise<void> {
  const [sentCount, outstanding] = await Promise.all([
    prisma.campaignRecipient.count({
      where: { campaignId, resendEmailId: { not: null } },
    }),
    prisma.campaignRecipient.count({
      where: {
        campaignId,
        status: { notIn: [...TERMINAL_STATUSES, "failed", "needs_review"] },
      },
    }),
  ]);

  const current = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { status: true },
  });

  // Never resurrect a campaign the user paused or cancelled.
  if (!current || current.status === "cancelled" || current.status === "paused") {
    return;
  }

  let status = current.status;
  if (outstanding === 0) {
    status = sentCount > 0 ? "completed" : "failed";
  } else if (sentCount > 0) {
    status = "sending";
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { sentCount, status },
  });
}

/**
 * Close out campaigns whose queue is empty but whose status never advanced.
 *
 * The previous completion check treated "failed" recipients as still-outstanding
 * work, so any campaign with even one bad address stayed on "sending" forever —
 * which is why a batch that fully dispatched could still look unfinished in the
 * dashboard. Runs on every scheduler tick.
 */
export async function sweepFinishedCampaigns(): Promise<number> {
  // Give an in-flight dispatch room to finish before we judge it stalled.
  const cutoff = new Date(Date.now() - 60_000);

  const candidates = await prisma.campaign.findMany({
    where: { status: { in: ["sending", "scheduled"] }, updatedAt: { lte: cutoff } },
    select: { id: true },
  });

  let reconciled = 0;
  for (const c of candidates) {
    const outstanding = await prisma.campaignRecipient.count({
      where: {
        campaignId: c.id,
        status: { notIn: [...TERMINAL_STATUSES, "failed", "needs_review"] },
      },
    });
    if (outstanding === 0) {
      await reconcileCampaign(c.id);
      reconciled++;
    }
  }

  return reconciled;
}

// ---------------------------------------------------------------------------
// The worker
// ---------------------------------------------------------------------------

/**
 * Drain a batch's queue, slice by slice, inside a time budget.
 *
 * Safe to call concurrently and safe to call repeatedly: claiming is atomic and
 * every already-dispatched row carries a `resendEmailId` that excludes it from
 * future claims, so a recipient is never emailed twice.
 */
export async function runBatchDispatch(
  campaignId: string,
  batchNumber: number,
  options: DispatchOptions = {},
): Promise<DispatchOutcome> {
  const budgetMs = options.budgetMs ?? DEFAULT_BUDGET_MS;
  const includeFailed = options.includeFailed ?? false;
  const startedAt = Date.now();

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  const product: ResolvedProduct = await resolveProduct(campaign.basis);

  const outcome: DispatchOutcome = {
    sent: 0,
    failed: 0,
    remaining: 0,
    timedOut: false,
    slices: 0,
    ids: [],
    errors: [],
  };

  const templateProps = {
    link: campaign.link || undefined,
    ...((campaign.templateProps as Record<string, unknown>) || {}),
  };

  // A manual retry is an explicit human decision to send these again, including
  // rows parked as "needs_review" where a duplicate is possible. Reset them to
  // the queue with a fresh attempt budget; the operator has accepted that risk.
  if (includeFailed) {
    const requeued = await prisma.campaignRecipient.updateMany({
      where: {
        campaignId,
        batchNumber,
        resendEmailId: null,
        status: { in: ["failed", "needs_review"] },
      },
      data: { status: "scheduled", attemptCount: 0, scheduledFor: new Date() },
    });
    if (requeued.count > 0) {
      console.log(
        `[dispatch] campaign=${campaignId} batch=${batchNumber} — manual retry requeued ${requeued.count} row(s).`,
      );
    }
  }

  let fatalError: unknown;

  // Ids we've already handled in this run. A claim that returns nothing new
  // means we're spinning — possible on a manual retry, where rows retired as
  // "failed" are deliberately claimable again.
  const seenIds = new Set<string>();

  try {
    while (true) {
      if (Date.now() - startedAt >= budgetMs) {
        outcome.timedOut = true;
        break;
      }

        const claimed = await claimSlice(campaignId, batchNumber, SLICE_SIZE);
      if (claimed.length === 0) break;

      if (claimed.every((r) => seenIds.has(r.id))) {
        await releaseSlice(claimed.filter((r) => !isDeliverableEmail(r.email)).map((r) => r.id));
        break;
      }
      for (const r of claimed) seenIds.add(r.id);

      // Addresses Resend will never accept (malformed, example.com, …) are a
      // permanent per-recipient problem, not a batch problem. Retire them here so
      // they can't make an otherwise-healthy slice look like a total failure.
      const sendable = claimed.filter((r) => isDeliverableEmail(r.email));
      const undeliverable = claimed.filter((r) => !isDeliverableEmail(r.email));

      if (undeliverable.length > 0) {
        await prisma.campaignRecipient.updateMany({
          where: { id: { in: undeliverable.map((r) => r.id) } },
          data: { status: "failed", bounceReason: "Undeliverable address" },
        });
        outcome.failed += undeliverable.length;
        outcome.errors.push(
          `Skipped ${undeliverable.length} undeliverable address(es): ` +
            undeliverable.slice(0, 5).map((r) => r.email).join(", "),
        );
      }

      if (sendable.length === 0) continue;

      console.log(
        `[dispatch] campaign=${campaignId} batch=${batchNumber} slice=${outcome.slices + 1} ` +
          `claimed=${claimed.length} sendable=${sendable.length} — calling Resend…`,
      );

      let result;
      try {
        result = await renderAndSendBatch(
          product,
          campaign.type,
          sendable.map((r) => ({
            email: r.email,
            name: r.firstName || "",
          })),
          campaign.subject,
          campaign.message,
          templateProps,
        );
      } catch (err) {
        // Transport/render blew up: nothing was queued at Resend for this slice,
        // so put it back rather than burning the recipients as "failed".
        await releaseSlice(sendable.map((c) => c.id));
        throw err;
      }

      // Every deliverable address rejected means the call itself failed (bad API
      // key, rate limit, network blip) — not that these 100 people are bad
      // addresses. `sendBatchTracked` swallows the throw and reports it as N
      // failures, so without this check one hiccup would permanently retire a
      // whole slice. Release it and let the scheduler retry; the circuit breaker
      // is what stops a genuinely broken batch from retrying forever.
      if (result.sent === 0) {
        await releaseSlice(sendable.map((c) => c.id));
        outcome.failed += sendable.length;
        if (result.errors?.length) outcome.errors.push(...result.errors);
        throw new Error(
          result.errors?.length
            ? result.errors.join("; ")
            : `Resend accepted none of the ${sendable.length} emails in this slice.`,
        );
      }

      const { sentCount, failedCount } = await persistSliceOutcome(
        campaignId,
        sendable,
        result.ids,
      );

      outcome.sent += sentCount;
      outcome.failed += failedCount;
      outcome.ids.push(...result.ids);
      if (result.errors?.length) outcome.errors.push(...result.errors);
      outcome.slices++;

      console.log(
        `[dispatch] campaign=${campaignId} batch=${batchNumber} slice=${outcome.slices} ` +
          `→ ${sentCount} sent, ${failedCount} failed`,
      );

      // Queue drained — a short slice means there was nothing more to claim.
      if (claimed.length < SLICE_SIZE) break;

      // Respect Resend's request rate limit between batch calls.
      await sleep(CHUNK_INTERVAL_MS);
    }

  } catch (err) {
    // Hold the error until the campaign row reflects the slices that did land —
    // otherwise a failure on slice 3 leaves slices 1 and 2 unaccounted for.
    fatalError = err;
  }

  outcome.remaining = await countRemainingInBatch(campaignId, batchNumber);
  await reconcileCampaign(campaignId);

  if (fatalError) throw fatalError;

  return outcome;
}
