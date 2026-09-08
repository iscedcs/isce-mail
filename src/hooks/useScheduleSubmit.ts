/**
 * useScheduleSubmit
 *
 * Shared hook used by every mail-form page to submit a campaign via
 * POST /api/campaigns.  Handles both "send now" (no scheduledFor) and
 * "schedule for later" (scheduledFor ISO string) paths.
 *
 * Usage:
 *   const { scheduleSubmit, isScheduling } = useScheduleSubmit();
 *   await scheduleSubmit({ type, basis, subject, message, link, recipients, scheduledFor });
 */

"use client";

import { useState } from "react";

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
  /** Any extra template-specific props (images, urls, etc.) */
  templateProps?: Record<string, unknown>;
}

export interface ScheduleResult {
  ok: boolean;
  message: string;
  campaignId?: string;
}

export function useScheduleSubmit() {
  const [isScheduling, setIsScheduling] = useState(false);

  const scheduleSubmit = async (
    payload: SchedulePayload,
  ): Promise<ScheduleResult> => {
    setIsScheduling(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, message: data.error ?? "Failed to schedule." };
      }
      const isScheduled = !!payload.scheduledFor;
      const hasBatches = data.batches && data.batches.length > 1;

      let message = isScheduled
        ? `Scheduled for ${new Date(payload.scheduledFor!).toLocaleString()} — ${payload.recipients.length} recipient(s).`
        : `Dispatched to ${payload.recipients.length} recipient(s).`;

      if (hasBatches && !isScheduled) {
        message = `Batch 1 dispatched (${data.batch1SentCount || 100} sent today). ${data.batches.length - 1} scheduled batch(es) queued (100/day).`;
      }

      if (data.excludedCount && data.excludedCount > 0) {
        message += ` [${data.excludedCount} bounced/suppressed contact(s) auto-excluded to protect quota]`;
      }

      return {
        ok: true,
        message,
        campaignId: data.id,
      };
    } catch {
      return { ok: false, message: "Network error. Try again." };
    } finally {
      setIsScheduling(false);
    }
  };

  return { scheduleSubmit, isScheduling };
}
