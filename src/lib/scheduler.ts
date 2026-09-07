/**
 * Scheduler  checks for due scheduled campaigns and dispatches them.
 * Called every 60s by instrumentation.ts setInterval.
 */

import { listCampaigns, updateCampaign, attachResendIds } from "@/lib/campaigns";
import { logSend } from "@/lib/send-history";

// Lazy imports of mail modules to avoid loading all templates at startup
const sendFunctions: Record<string, () => Promise<any>> = {
  appreciation: () => import("@/lib/mail-action/appreciation/mail").then((m) => m.sendBulkEmailTracked),
  announcement: () => import("@/lib/mail-action/announcement/mail").then((m) => m.sendBulkEmailTracked),
  newsletter: () => import("@/lib/mail-action/newsletter/mail").then((m) => m.sendBulkEmailTracked),
  event: () => import("@/lib/mail-action/event/mail").then((m) => m.sendBulkEmailTracked),
  holiday: () => import("@/lib/mail-action/holiday/mail").then((m) => m.sendBulkEmailTracked),
  survey: () => import("@/lib/mail-action/survey/mail").then((m) => m.sendBulkEmailTracked),
  welcome: () => import("@/lib/mail-action/welcome/mail").then((m) => m.sendBulkEmailTracked),
  promotion: () => import("@/lib/mail-action/promotion/mail").then((m) => m.sendBulkEmailTracked),
  "cohort-welcome": () => import("@/lib/mail-action/cohort-welcome/mail").then((m) => m.sendBulkEmailTracked),
  "course-promo": () => import("@/lib/mail-action/course-promo/mail").then((m) => m.sendBulkEmailTracked),
  curriculum: () => import("@/lib/mail-action/curriculum/mail").then((m) => m.sendBulkEmailTracked),
};

export async function checkAndRunScheduledCampaigns(): Promise<{
  dispatched: number;
  skipped: number;
}> {
  const now = new Date();
  const campaigns = listCampaigns();
  const due = campaigns.filter(
    (c) =>
      c.status === "scheduled" &&
      c.scheduledFor &&
      new Date(c.scheduledFor) <= now,
  );

  let dispatched = 0;

  for (const campaign of due) {
    // Mark as sending immediately to prevent double-dispatch
    updateCampaign(campaign.id, { status: "sending" });

    try {
      const sendFnLoader = sendFunctions[campaign.type];
      if (!sendFnLoader) {
        updateCampaign(campaign.id, {
          status: "failed",
          sentAt: new Date().toISOString(),
        });
        continue;
      }

      const sendFn = await sendFnLoader();
      const recipients = campaign.recipients.map((r) => ({
        email: r.email,
        name: r.firstname,
      }));

            let result: any;
      const props = (campaign as any).templateProps || {};

      switch (campaign.type) {
        case "cohort-welcome":
          result = await sendFn(
            recipients,
            campaign.subject,
            campaign.basis,
            campaign.message,
            props.cohortName || "Our Cohort",
            props.startDate || new Date().toLocaleDateString(),
            props.mentorName || "Lead Instructor",
            props.communityLink || campaign.link || "",
            campaign.link || "",
            props.bannerImage,
          );
          break;
        case "course-promo":
          result = await sendFn(
            recipients,
            campaign.subject,
            campaign.basis,
            campaign.message,
            props.courseTitle || campaign.subject,
            props.originalPrice || "",
            props.discountPrice || "",
            props.deadline || "",
            campaign.link || "",
            props.bannerImage,
          );
          break;
        case "curriculum":
          result = await sendFn(
            recipients,
            campaign.subject,
            campaign.basis,
            campaign.message,
            props.courseName || campaign.subject,
            campaign.link || "",
            props.pdfUrl,
            props.bannerImage,
          );
          break;
        case "holiday":
          result = await sendFn(
            recipients,
            campaign.subject,
            campaign.basis,
            campaign.message,
            props.image || campaign.link || "",
          );
          break;
        case "newsletter":
          result = await sendFn(
            recipients,
            campaign.subject,
            campaign.basis,
            campaign.message,
            props.image || "",
          );
          break;
        case "promotion":
          result = await sendFn(
            recipients,
            campaign.subject,
            campaign.basis,
            campaign.message,
            campaign.link || "",
            props.image || "",
          );
          break;
        default:
          // appreciation, announcement, event, survey, welcome
          result = await sendFn(
            recipients,
            campaign.subject,
            campaign.basis,
            campaign.message,
            campaign.link || "",
          );
          break;
      }

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
      console.error(`[scheduler] Campaign ${campaign.id} failed:`, err);
    }
  }

  return { dispatched, skipped: due.length - dispatched };
}
