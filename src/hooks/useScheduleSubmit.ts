/**
 * useScheduleSubmit
 *
 * Shared hook used by every mail-form page to submit a campaign via
 * POST /api/campaigns. Handles both "send now" (no scheduledFor) and
 * "schedule for later" (scheduledFor ISO string) paths.
 *
 * Progress model
 * --------------
 * A serverless invocation has a hard 60s ceiling, so one HTTP request cannot be
 * relied on to send an arbitrarily large campaign. The server dispatches as much
 * of Batch 1 as fits its deadline and reports what is still queued; this hook
 * then drives the remainder by calling the dispatch endpoint again until it
 * drains, updating a single toast as it goes.
 *
 * Everything left over is durable either way — the rows stay queued and the
 * scheduler tick finishes them — so closing the tab mid-send loses nothing. The
 * continuation loop exists to make progress *visible*, not to make it happen.
 *
 * Usage:
 *   const { scheduleSubmit, isScheduling } = useScheduleSubmit();
 *   await scheduleSubmit({ type, basis, subject, message, link, recipients, scheduledFor });
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";

export interface SchedulePayload {
  type: string;
  basis: string;
  subject: string;
  message: string;
  link?: string;
  image?: string;
  recipients: { email: string; firstname?: string; name?: string; url?: string }[];
  /** ISO string. Absent = send now via the campaigns route. */
  scheduledFor?: string;
  /**
   * Force the whole campaign into a single batch, ignoring the product's
   * `dailyQuota`. Set by the "send as one batch" override in the confirm
   * dialog; absent means split into daily batches at the product's quota.
   */
  batchSize?: number;
  /** Any extra template-specific props (images, urls, etc.) */
  templateProps?: Record<string, unknown>;
}

export interface ScheduleResult {
  ok: boolean;
  message: string;
  campaignId?: string;
}

/**
 * Abort the create request before Vercel's own 60s ceiling does.
 *
 * Letting it hit the platform limit produced a raw 504
 * (FUNCTION_INVOCATION_TIMEOUT) that surfaced as "Network error. Try again." —
 * alarming and wrong, because the emails were going out fine.
 */
const CREATE_TIMEOUT_MS = 55_000;

/** Ceiling on continuation rounds, so a stuck batch can't spin forever. */
const MAX_CONTINUE_ROUNDS = 40;

export function useScheduleSubmit() {
  const [isScheduling, setIsScheduling] = useState(false);

  /**
   * Drive the rest of Batch 1 to completion, reporting progress into `toastId`.
   * Returns how many this loop managed to send.
   *
   * Best-effort by design: the dispatch route requires an admin session, and the
   * mail forms are reachable without one. A 401 here is not a failure — it just
   * means the scheduler tick finishes the job instead of the browser.
   */
  const continueDispatch = async (
    campaignId: string,
    alreadySent: number,
    total: number,
    toastId: string | number,
  ): Promise<{ sent: number; drained: boolean }> => {
    let sent = alreadySent;

    for (let round = 0; round < MAX_CONTINUE_ROUNDS; round++) {
      let res: Response;
      try {
        res = await fetch(`/api/campaigns/${campaignId}/dispatch-batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchNumber: 1 }),
        });
      } catch {
        return { sent, drained: false };
      }

      if (!res.ok) return { sent, drained: false };

      const data = await res.json().catch(() => null);
      if (!data) return { sent, drained: false };

      sent += data.result?.sent ?? 0;
      toast.loading(`Sending… ${sent.toLocaleString()} of ${total.toLocaleString()} delivered to Resend`, {
        id: toastId,
      });

      if (data.done !== false) return { sent, drained: true };
    }

    return { sent, drained: false };
  };

  const scheduleSubmit = async (
    payload: SchedulePayload,
  ): Promise<ScheduleResult> => {
    setIsScheduling(true);

    const total = payload.recipients.length;
    const isScheduled = !!payload.scheduledFor;

    const toastId = toast.loading(
      isScheduled
        ? `Scheduling ${total.toLocaleString()} recipient(s)…`
        : `Preparing to send to ${total.toLocaleString()} recipient(s)…`,
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CREATE_TIMEOUT_MS);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = data.error ?? "Failed to schedule.";
        toast.error(message, { id: toastId });
        return { ok: false, message };
      }

      // ---- Scheduled for later: nothing is sending yet. ----
      if (isScheduled) {
        let message = `Scheduled for ${new Date(payload.scheduledFor!).toLocaleString()} — ${total.toLocaleString()} recipient(s).`;
        if (data.excludedCount > 0) {
          message += ` ${data.excludedCount} bounced/suppressed contact(s) excluded.`;
        }
        toast.success(message, { id: toastId, duration: 8000 });
        return { ok: true, message, campaignId: data.id };
      }

      // ---- Send now ----
      const batchCount = data.batches?.length ?? 1;
      let sent: number = data.batch1SentCount ?? 0;
      const queued: number = data.batch1Remaining ?? 0;

      if (queued > 0) {
        toast.loading(
          `Sending… ${sent.toLocaleString()} of ${(sent + queued).toLocaleString()} delivered to Resend`,
          { id: toastId },
        );
        const outcome = await continueDispatch(data.id, sent, sent + queued, toastId);
        sent = outcome.sent;

        if (!outcome.drained) {
          const message =
            `${sent.toLocaleString()} sent so far. The rest stays queued and the ` +
            `scheduler will finish it within a minute — check History for progress.`;
          toast.success(message, { id: toastId, duration: 10000 });
          return { ok: true, message, campaignId: data.id };
        }
      }

      let message = `Sent to ${sent.toLocaleString()} recipient(s).`;
      if (batchCount > 1) {
        const perDay = data.batches?.[0]?.count ?? sent;
        message += ` ${batchCount - 1} further batch(es) queued at ${perDay.toLocaleString()}/day.`;
      }
      if (data.excludedCount > 0) {
        message += ` ${data.excludedCount} bounced/suppressed contact(s) excluded.`;
      }
      if (data.dispatchError) {
        // Partial failure: some addresses were rejected. Say so rather than
        // reporting a clean success.
        toast.warning(`${message} Some addresses failed: ${data.dispatchError}`, {
          id: toastId,
          duration: 12000,
        });
        return { ok: true, message, campaignId: data.id };
      }

      toast.success(message, { id: toastId, duration: 8000 });
      return { ok: true, message, campaignId: data.id };
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";

      // An abort means the request outlived its window, NOT that nothing
      // happened — the campaign row and its recipients were committed before
      // dispatch began, so the scheduler will carry it to completion.
      const message = aborted
        ? "Still sending. The request took longer than its window, but the campaign was created and the scheduler will finish it — check History."
        : "Could not reach the server. Check History before resending, in case the campaign was created.";

      if (aborted) {
        toast.success(message, { id: toastId, duration: 12000 });
      } else {
        toast.error(message, { id: toastId, duration: 12000 });
      }
      return { ok: aborted, message };
    } finally {
      clearTimeout(timer);
      setIsScheduling(false);
    }
  };

  return { scheduleSubmit, isScheduling };
}
