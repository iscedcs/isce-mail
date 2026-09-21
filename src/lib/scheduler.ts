/**
 * scheduler.ts — checks for due scheduled campaigns and dispatches them.
 * Called every 60s by instrumentation.ts setInterval.
 *
 * Neon Postgres via Prisma is the primary store for scheduled batches.
 * Legacy JSON campaigns are preserved with deprecation warning.
 *
 * Circuit Breaker (in-memory):
 *   Tracks consecutive dispatch failures per batch. After MAX_BATCH_FAILURES
 *   consecutive failures the batch is marked "failed" in the DB so it stops
 *   silently retrying and surfaces the error in the UI instead.
 */

import { listCampaigns, updateCampaign, attachResendIds } from "@/lib/campaigns";
import { logSend } from "@/lib/send-history";
import { prisma } from "@/lib/prisma";
import { dispatchScheduledBatch } from "@/lib/campaign-db";
import {
  STALE_SENDING_MS,
  sweepFinishedCampaigns,
  quarantineAmbiguousRecipients,
} from "@/lib/dispatch";
import { resolveProduct } from "@/lib/product-resolver";
import { renderAndSendBatch } from "@/lib/email-engine";

let isTickerRunning = false;

// ---------------------------------------------------------------------------
// Circuit Breaker — in-memory, no DB schema change required
// ---------------------------------------------------------------------------

/**
 * Wall-clock budget for one tick, shared across every due batch. Kept under the
 * route's `maxDuration = 60` so the tick always gets to return cleanly.
 */
const TICK_BUDGET_MS = 50_000;

/** Don't start another batch unless there's time for at least one Resend call. */
const MIN_SLICE_BUDGET_MS = 5_000;

/** Max consecutive failures before a batch is permanently marked "failed". */
const MAX_BATCH_FAILURES = 3;

/** key: `${campaignId}_${batchNumber}` → consecutive failure count */
const batchFailureCount = new Map<string, number>();

/** key: `${campaignId}_${batchNumber}` → last error message */
const batchLastError = new Map<string, string>();

function batchKey(campaignId: string, batchNumber: number) {
  return `${campaignId}_${batchNumber}`;
}

function recordBatchSuccess(campaignId: string, batchNumber: number) {
  batchFailureCount.delete(batchKey(campaignId, batchNumber));
  batchLastError.delete(batchKey(campaignId, batchNumber));
}

function recordBatchFailure(campaignId: string, batchNumber: number, err: unknown): number {
  const key = batchKey(campaignId, batchNumber);
  const count = (batchFailureCount.get(key) ?? 0) + 1;
  batchFailureCount.set(key, count);
  batchLastError.set(key, err instanceof Error ? err.message : String(err));
  return count;
}

async function tripCircuitBreaker(campaignId: string, batchNumber: number) {
  const errMsg = batchLastError.get(batchKey(campaignId, batchNumber)) ?? "Repeated dispatch failures";
  console.error(
    `[scheduler] ⚡ Circuit breaker tripped for campaign ${campaignId} batch ${batchNumber} ` +
    `after ${MAX_BATCH_FAILURES} failures. Marking batch as failed. Last error: ${errMsg}`,
  );

  // Mark all stuck recipients in this batch as "failed" so they stop being retried
  await prisma.campaignRecipient.updateMany({
    where: {
      campaignId,
      batchNumber,
      resendEmailId: null,
      status: { notIn: ["sent", "delivered", "opened", "clicked", "bounced", "failed", "cancelled"] },
    },
    data: { status: "failed" },
  });

  // Check if all batches are now done (all either sent/failed/cancelled)
  const remaining = await prisma.campaignRecipient.count({
    where: {
      campaignId,
      status: { notIn: ["sent", "delivered", "opened", "clicked", "bounced", "failed", "cancelled"] },
    },
  });

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: remaining === 0 ? "failed" : "sending" },
  });

  // Clear from tracker so it can be manually retried later if needed
  batchFailureCount.delete(batchKey(campaignId, batchNumber));
  batchLastError.delete(batchKey(campaignId, batchNumber));
}

export async function checkAndRunScheduledCampaigns(): Promise<{
  dispatched: number;
  skipped: number;
}> {
  if (isTickerRunning) {
    console.log("[scheduler] Previous tick is still running. Skipping concurrent run.");
    return { dispatched: 0, skipped: 0 };
  }

  isTickerRunning = true;

  try {
    const now = new Date();
    const tickStartedAt = Date.now();
    let dispatched = 0;
    let skipped = 0;

    // 1. Neon Postgres via Prisma — primary dispatch store for multi-product batches
    try {
      // A batch is due when it has recipients that are queued and ready, OR when
      // it has recipients wedged in "sending" with no Resend id for longer than
      // any invocation could legitimately take (i.e. a dead worker). The old
      // code pre-emptively reset those to "scheduled" in a separate write, which
      // could race a send that was genuinely still running and cause a double
      // send; claimSlice() in lib/dispatch.ts now re-claims them atomically
      // instead, so the tick only has to *find* them.
      const staleCutoff = new Date(now.getTime() - STALE_SENDING_MS);

      // Park anything whose send outcome is unknowable before looking for work,
      // so the claim below can never pick it up and email someone twice.
      const quarantined = await quarantineAmbiguousRecipients();
      if (quarantined > 0) {
        console.warn(
          `[scheduler] ⚠ ${quarantined} recipient(s) moved to needs_review — dispatch outcome unknown, not re-sent.`,
        );
      }

      const dueBatches = await prisma.campaignRecipient.findMany({
        where: {
          resendEmailId: null,
          campaign: {
            status: { notIn: ["paused", "cancelled", "completed", "manual"] },
          },
          OR: [
            {
              status: { in: ["pending", "scheduled"] },
              // Due now, or a "Send Now" Batch 1 with no scheduled date.
              OR: [{ scheduledFor: { lte: now } }, { scheduledFor: null }],
            },
            { status: "sending", updatedAt: { lte: staleCutoff } },
          ],
        },
        select: {
          campaignId: true,
          batchNumber: true,
        },
        distinct: ["campaignId", "batchNumber"],
      });

      if (dueBatches.length > 0) {
        console.log(`[scheduler] ${dueBatches.length} due batch(es) to dispatch.`);
      }

      for (const batch of dueBatches) {
        // Share one wall-clock budget across the whole tick so a big campaign
        // can't starve the others or overrun the invocation limit. Anything we
        // don't reach stays queued for the next tick.
        const elapsed = Date.now() - tickStartedAt;
        const budgetMs = TICK_BUDGET_MS - elapsed;
        if (budgetMs <= MIN_SLICE_BUDGET_MS) {
          console.log("[scheduler] Tick budget exhausted — remaining batches deferred to next tick.");
          skipped += dueBatches.length - dispatched;
          break;
        }

        try {
          await dispatchScheduledBatch(batch.campaignId, batch.batchNumber, { budgetMs });
          recordBatchSuccess(batch.campaignId, batch.batchNumber);
          dispatched++;
        } catch (batchErr) {
          const failures = recordBatchFailure(batch.campaignId, batch.batchNumber, batchErr);
          console.error(
            `[scheduler] Failed to dispatch batch ${batch.batchNumber} for campaign ${batch.campaignId} ` +
            `(attempt ${failures}/${MAX_BATCH_FAILURES}):`,
            batchErr,
          );
          if (failures >= MAX_BATCH_FAILURES) {
            try {
              await tripCircuitBreaker(batch.campaignId, batch.batchNumber);
            } catch (cbErr) {
              console.error("[scheduler] Failed to trip circuit breaker:", cbErr);
            }
          }
        }
      }
    } catch (dbErr) {
      console.error("[scheduler] Database batch polling error:", dbErr);
    }

    // 2. Close out campaigns that fully dispatched but never had their status
    //    advanced (e.g. a batch that ended with a couple of failed addresses).
    try {
      const reconciled = await sweepFinishedCampaigns();
      if (reconciled > 0) {
        console.log(`[scheduler] Reconciled ${reconciled} finished campaign(s).`);
      }
    } catch (sweepErr) {
      console.error("[scheduler] Campaign reconciliation sweep failed:", sweepErr);
    }

    // 3. Legacy flat-file JSON store (deprecated)
    try {
      const legacyCampaigns = listCampaigns();
      const dueLegacy = legacyCampaigns.filter(
        (c) =>
          c.status === "scheduled" &&
          c.scheduledFor &&
          new Date(c.scheduledFor) <= now,
      );

      if (dueLegacy.length > 0) {
        console.warn(
          `[scheduler] Found ${dueLegacy.length} legacy JSON scheduled campaign(s). Migrating to engine dispatch.`,
        );
      }

      for (const campaign of dueLegacy) {
        updateCampaign(campaign.id, { status: "sending" });

        try {
          const product = await resolveProduct(campaign.basis || "isce");
          const recipients = campaign.recipients.map((r) => ({
            email: r.email,
            name: r.firstname,
          }));
          const props = (campaign as any).templateProps || {};

          const result = await renderAndSendBatch(
            product,
            campaign.type,
            recipients,
            campaign.subject,
            campaign.message,
            { ...props, link: campaign.link },
          );

          attachResendIds(campaign.id, result.ids ?? []);

          updateCampaign(campaign.id, {
            status: "sent",
            sentAt: new Date().toISOString(),
            stats: {
              ...campaign.stats,
              sent: result.sent,
              failed: result.failed,
            },
          });

          logSend({
            type: campaign.type,
            basis: campaign.basis,
            subject: campaign.subject,
            recipientCount: result.sent,
          });

          dispatched++;
        } catch (err) {
          updateCampaign(campaign.id, {
            status: "failed",
            sentAt: new Date().toISOString(),
          });
          console.error(`[scheduler] Legacy campaign ${campaign.id} failed:`, err);
        }
      }
    } catch (legacyErr) {
      // Non-fatal if legacy store doesn't exist
    }

    return { dispatched, skipped };
  } finally {
    isTickerRunning = false;
  }
}
