/**
 * scheduler.ts — checks for due scheduled campaigns and dispatches them.
 * Called every 60s by instrumentation.ts setInterval.
 *
 * Neon Postgres via Prisma is the primary store for scheduled batches.
 * Legacy JSON campaigns are preserved with deprecation warning.
 */

import { listCampaigns, updateCampaign, attachResendIds } from "@/lib/campaigns";
import { logSend } from "@/lib/send-history";
import { prisma } from "@/lib/prisma";
import { dispatchScheduledBatch } from "@/lib/campaign-db";
import { resolveProduct } from "@/lib/product-resolver";
import { renderAndSendBatch } from "@/lib/email-engine";

let isTickerRunning = false;

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
    let dispatched = 0;

    // 1. Neon Postgres via Prisma — Primary dispatch store for multi-product batches
    try {
      // Self-healing: Reset any recipients stuck in "sending" for > 5 minutes without a resendEmailId
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      await prisma.campaignRecipient.updateMany({
        where: {
          status: "sending",
          resendEmailId: null,
          updatedAt: { lte: fiveMinutesAgo },
        },
        data: {
          status: "scheduled",
        },
      });

      const dueBatches = await prisma.campaignRecipient.findMany({
        where: {
          status: { in: ["pending", "scheduled"] },
          // Dispatch batches that are due OR have no scheduledFor (Batch 1 "Send Now" that got stuck)
          OR: [
            { scheduledFor: { lte: now } },
            { scheduledFor: null },
          ],
        },
        select: {
          campaignId: true,
          batchNumber: true,
        },
        distinct: ["campaignId", "batchNumber"],
      });

      for (const batch of dueBatches) {
        try {
          await dispatchScheduledBatch(batch.campaignId, batch.batchNumber);
          dispatched++;
        } catch (batchErr) {
          console.error(
            `[scheduler] Failed to auto-dispatch batch ${batch.batchNumber} for campaign ${batch.campaignId}:`,
            batchErr,
          );
        }
      }
    } catch (dbErr) {
      console.error("[scheduler] Database batch polling error:", dbErr);
    }

    // 2. Legacy flat-file JSON store (deprecated)
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

    return { dispatched, skipped: 0 };
  } finally {
    isTickerRunning = false;
  }
}
