import { prisma } from "@/lib/prisma";
import { IBasis } from "@/lib/mail-action/shared";

// Lazy imports of mail modules for all 11 template types
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

async function dispatchEmail(
  type: string,
  basis: IBasis,
  subject: string,
  message: string,
  link?: string,
  templateProps: Record<string, any> = {},
  recipients: { email: string; name?: string; firstname?: string }[] = [],
): Promise<{ sent: number; failed: number; ids: { resendEmailId: string; email: string }[] }> {
  const sendFnLoader = sendFunctions[type];
  if (!sendFnLoader) {
    throw new Error(`Unknown campaign template type: ${type}`);
  }

  const sendFn = await sendFnLoader();
  const formattedRecipients = recipients.map((r) => ({
    email: r.email.trim().toLowerCase(),
    name: r.firstname || r.name || "",
  }));

  const props = templateProps || {};

  switch (type) {
    case "cohort-welcome":
      return await sendFn(
        formattedRecipients,
        subject,
        basis,
        message,
        props.cohortName || "Our Cohort",
        props.startDate || new Date().toLocaleDateString(),
        props.mentorName || "Lead Instructor",
        props.communityLink || link || "",
        link || "",
        props.bannerImage,
      );
    case "course-promo":
      return await sendFn(
        formattedRecipients,
        subject,
        basis,
        message,
        props.courseTitle || subject,
        props.originalPrice || "",
        props.discountPrice || "",
        props.deadline || "",
        link || "",
        props.bannerImage,
      );
    case "curriculum":
      return await sendFn(
        formattedRecipients,
        subject,
        basis,
        message,
        props.courseName || subject,
        link || "",
        props.pdfUrl,
        props.bannerImage,
      );
    case "holiday":
      return await sendFn(
        formattedRecipients,
        subject,
        basis,
        message,
        props.image || link || "",
      );
    case "newsletter":
      return await sendFn(
        formattedRecipients,
        subject,
        basis,
        message,
        props.image || "",
      );
    case "promotion":
      return await sendFn(
        formattedRecipients,
        subject,
        basis,
        message,
        link || "",
        props.image || "",
      );
    default:
      // appreciation, announcement, event, survey, welcome
      return await sendFn(
        formattedRecipients,
        subject,
        basis,
        message,
        link || "",
      );
  }
}

export interface RecipientInput {
  email: string;
  name?: string;
  firstname?: string;
  url?: string;
}

export interface CreateCampaignParams {
  type: string;
  basis: IBasis;
  subject: string;
  message: string;
  link?: string;
  templateProps?: Record<string, any>;
  recipients: RecipientInput[];
  batchSize?: number; // default: 100 (Resend daily quota)
  scheduledFor?: string; // If specified, starts on this date instead of now
}

export interface BatchInfo {
  batchNumber: number;
  count: number;
  status: "sent" | "scheduled" | "pending";
  scheduledFor: string | null;
  sentAt?: string | null;
  recipients: { email: string; name?: string }[];
}

export interface CampaignResult {
  campaignId: string;
  type: string;
  subject: string;
  totalTarget: number;
  excludedCount: number;
  validCount: number;
  batches: BatchInfo[];
  batch1SentCount: number;
}

/**
 * Creates a campaign in Neon Postgres using Prisma, segments recipients into daily batches of 100,
 * and dispatches Batch 1 immediately (or schedules if scheduledFor is in future).
 */
export async function createCampaignWithBatches(
  params: CreateCampaignParams,
): Promise<CampaignResult> {
  const batchSize = params.batchSize || 100;

  // Deduplicate incoming recipients
  const seenEmails = new Set<string>();
  const rawList: RecipientInput[] = [];
  for (const r of params.recipients) {
    const clean = r.email?.trim().toLowerCase();
    if (clean && clean.includes("@") && !seenEmails.has(clean)) {
      seenEmails.add(clean);
      rawList.push({
        email: clean,
        name: r.firstname || r.name || "",
      });
    }
  }

  // 1. Bulk Upsert Contacts into Prisma
  await prisma.contact.createMany({
    data: rawList.map((r) => ({
      email: r.email,
      firstName: r.name || null,
      status: "active",
    })),
    skipDuplicates: true,
  });

  // Query suppressed or bounced contacts to protect user's daily quota
  const badContacts = await prisma.contact.findMany({
    where: {
      email: { in: rawList.map((r) => r.email) },
      status: { in: ["bounced", "suppressed", "unsubscribed"] },
    },
    select: { email: true, status: true, bounceReason: true },
  });

  const badEmailSet = new Set(badContacts.map((b: { email: string }) => b.email));
  const validRecipients = rawList.filter((r) => !badEmailSet.has(r.email));

  if (validRecipients.length === 0) {
    throw new Error(
      `All ${rawList.length} recipients are currently marked as bounced or suppressed. No emails were sent to protect your domain reputation.`,
    );
  }

  // 2. Partition valid recipients into batches (100 per day)
  const totalBatches = Math.ceil(validRecipients.length / batchSize);
  const startTime = params.scheduledFor ? new Date(params.scheduledFor) : new Date();
  const isFutureScheduled = params.scheduledFor ? new Date(params.scheduledFor) > new Date() : false;
  const batches: BatchInfo[] = [];

  for (let i = 0; i < totalBatches; i++) {
    const batchNum = i + 1;
    const batchRecipients = validRecipients.slice(i * batchSize, (i + 1) * batchSize);

    // Batch 1 is either now or startTime. Batch 2 is +24h, Batch 3 is +48h, etc.
    let scheduledDate: Date | null = null;
    if (batchNum === 1) {
      scheduledDate = isFutureScheduled ? startTime : null;
    } else {
      scheduledDate = new Date(startTime.getTime() + (batchNum - 1) * 24 * 60 * 60 * 1000);
    }

    batches.push({
      batchNumber: batchNum,
      count: batchRecipients.length,
      status: batchNum === 1 && !isFutureScheduled ? "sent" : "scheduled",
      scheduledFor: scheduledDate ? scheduledDate.toISOString() : null,
      recipients: batchRecipients,
    });
  }

  // 3. Create Campaign row via Prisma
  const campaign = await prisma.campaign.create({
    data: {
      type: params.type,
      basis: params.basis,
      subject: params.subject,
      message: params.message,
      link: params.link || null,
      templateProps: (params.templateProps || {}) as any,
      status: isFutureScheduled ? "scheduled" : "sending",
      totalRecipients: validRecipients.length,
      sentCount: 0,
    },
  });

  const campaignId = campaign.id;

  // 4. Bulk save all campaign recipients tagged with their batchNumber
  const recipientRecords = [];
  for (const b of batches) {
    for (const r of b.recipients) {
      recipientRecords.push({
        campaignId,
        email: r.email,
        firstName: r.name || null,
        batchNumber: b.batchNumber,
        scheduledFor: b.scheduledFor ? new Date(b.scheduledFor) : null,
        status: b.batchNumber === 1 && !isFutureScheduled ? "sending" : "pending",
      });
    }
  }

  await prisma.campaignRecipient.createMany({
    data: recipientRecords,
  });

  // 5. If not future scheduled, immediately dispatch Batch 1!
  let batch1SentCount = 0;
  if (!isFutureScheduled) {
    const batch1 = batches[0];
    const dispatchResult = await dispatchEmail(
      params.type,
      params.basis,
      params.subject,
      params.message,
      params.link,
      params.templateProps,
      batch1.recipients,
    );

    batch1SentCount = dispatchResult.sent;
    batch1.sentAt = new Date().toISOString();

    const idMap = new Map(dispatchResult.ids.map((item) => [item.email.toLowerCase(), item.resendEmailId]));
    const batch1Emails = batch1.recipients.map((r) => r.email.toLowerCase());

    // Update recipients with status & resend IDs in parallel
    await Promise.all(
      batch1.recipients.map((r) => {
        const resendId = idMap.get(r.email.toLowerCase()) || null;
        return prisma.campaignRecipient.updateMany({
          where: { campaignId, email: r.email },
          data: {
            status: "sent",
            sentAt: new Date(),
            resendEmailId: resendId,
          },
        });
      }),
    );

    // Update contacts totalSent in bulk
    await prisma.contact.updateMany({
      where: { email: { in: batch1Emails } },
      data: {
        totalSent: { increment: 1 },
        lastSentAt: new Date(),
      },
    });

    const allSentNow = batches.length === 1;
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sentCount: dispatchResult.sent,
        status: allSentNow ? "completed" : "sending",
      },
    });
  }

  return {
    campaignId,
    type: params.type,
    subject: params.subject,
    totalTarget: rawList.length,
    excludedCount: badContacts.length,
    validCount: validRecipients.length,
    batches,
    batch1SentCount,
  };
}

/**
 * List all campaigns from Prisma formatted for the History dashboard.
 */
export async function listCampaignsFromDb() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      recipients: {
        orderBy: [{ batchNumber: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return campaigns.map((c: any) => {
    // Group recipients by batch
    const batchMap = new Map<number, any[]>();
    for (const r of c.recipients) {
      if (!batchMap.has(r.batchNumber)) batchMap.set(r.batchNumber, []);
      batchMap.get(r.batchNumber)!.push(r);
    }

    const batches = Array.from(batchMap.entries()).map(([batchNumber, recs]) => ({
      batchNumber,
      count: recs.length,
      status: recs.every((r) => ["sent", "delivered", "opened", "clicked", "bounced"].includes(r.status))
        ? "sent"
        : recs.some((r) => r.status === "sending")
          ? "sending"
          : "scheduled",
      scheduledFor: recs[0]?.scheduledFor?.toISOString() || null,
      sentAt: recs.find((r) => r.sentAt)?.sentAt?.toISOString() || null,
      recipients: recs.map((r) => ({
        email: r.email,
        name: r.firstName || "",
        status: r.status,
        resendEmailId: r.resendEmailId,
        bounceReason: r.bounceReason,
        sentAt: r.sentAt?.toISOString() || null,
        deliveredAt: r.deliveredAt?.toISOString() || null,
        openedAt: r.openedAt?.toISOString() || null,
        clickedAt: r.clickedAt?.toISOString() || null,
        bouncedAt: r.bouncedAt?.toISOString() || null,
      })),
    }));

    return {
      id: c.id,
      type: c.type,
      basis: c.basis,
      subject: c.subject,
      message: c.message,
      link: c.link,
      templateProps: c.templateProps,
      status: c.status,
      scheduledFor: c.recipients[0]?.scheduledFor?.toISOString() || undefined,
      createdAt: c.createdAt.toISOString(),
      completedAt: c.status === "completed" ? c.updatedAt.toISOString() : undefined,
      recipients: c.recipients.map((r: any) => ({
        email: r.email,
        firstname: r.firstName || "",
        status: r.status,
        resendEmailId: r.resendEmailId,
        bounceReason: r.bounceReason,
        batchNumber: r.batchNumber,
        scheduledFor: r.scheduledFor?.toISOString() || null,
        events: {
          delivered: !!r.deliveredAt,
          opened: !!r.openedAt,
          clicked: !!r.clickedAt,
          bounced: !!r.bouncedAt,
        },
      })),
      batches,
      stats: {
        total: c.totalRecipients,
        sent: c.sentCount,
        delivered: c.deliveredCount,
        opened: c.openedCount,
        clicked: c.clickedCount,
        bounced: c.bouncedCount,
      },
    };
  });
}

/**
 * Get details and batches for a specific campaign.
 */
export async function getCampaignBatchesFromDb(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      recipients: {
        orderBy: [{ batchNumber: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!campaign) return null;

  const batchMap = new Map<number, any>();
  for (const r of campaign.recipients) {
    if (!batchMap.has(r.batchNumber)) {
      batchMap.set(r.batchNumber, {
        batchNumber: r.batchNumber,
        scheduledFor: r.scheduledFor?.toISOString() || null,
        status: r.batchNumber === 1 ? "sent" : (r.status === "sent" ? "sent" : "scheduled"),
        recipients: [],
      });
    }
    batchMap.get(r.batchNumber).recipients.push(r);
  }

  return {
    campaign,
    batches: Array.from(batchMap.values()),
  };
}

/**
 * Dispatches a specific queued batch (e.g. Batch 2 or Batch 3) via Resend.
 */
export async function dispatchScheduledBatch(campaignId: string, batchNumber: number) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) throw new Error("Campaign not found");

  const pendingRecipients = await prisma.campaignRecipient.findMany({
    where: {
      campaignId,
      batchNumber,
      status: { in: ["pending", "scheduled"] },
    },
  });

  if (pendingRecipients.length === 0) {
    return { sent: 0, message: "No pending recipients for this batch." };
  }

  const result = await dispatchEmail(
    campaign.type,
    campaign.basis as IBasis,
    campaign.subject,
    campaign.message,
    campaign.link || undefined,
    (campaign.templateProps as Record<string, any>) || {},
    pendingRecipients.map((r: any) => ({ email: r.email, firstname: r.firstName || undefined })),
  );

  const idMap = new Map(result.ids.map((item) => [item.email.toLowerCase(), item.resendEmailId]));

  for (const r of pendingRecipients) {
    const resendId = idMap.get(r.email.toLowerCase()) || null;
    await prisma.campaignRecipient.updateMany({
      where: { campaignId, email: r.email },
      data: {
        status: "sent",
        sentAt: new Date(),
        resendEmailId: resendId,
      },
    });

    await prisma.contact.update({
      where: { email: r.email },
      data: {
        totalSent: { increment: 1 },
        lastSentAt: new Date(),
      },
    });
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      sentCount: { increment: result.sent },
    },
  });

  // Check if all batches are now completed
  const remaining = await prisma.campaignRecipient.count({
    where: {
      campaignId,
      status: { notIn: ["sent", "delivered", "opened", "clicked", "bounced"] },
    },
  });

  if (remaining === 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "completed" },
    });
  }

  return { sent: result.sent, ids: result.ids };
}

/**
 * Handle incoming Resend webhooks and update Neon Postgres tables in real time via Prisma.
 */
export async function recordWebhookEventInDb(params: {
  resendEmailId: string;
  eventType: string;
  recipientEmail?: string;
  bounceReason?: string;
}) {
  const { resendEmailId, eventType, recipientEmail, bounceReason } = params;

  // 1. Log event in Prisma
  await prisma.emailEvent.create({
    data: {
      resendEmailId: resendEmailId || null,
      recipientEmail: recipientEmail || "",
      eventType,
      bounceReason: bounceReason || null,
    },
  });

  // 2. Link with CampaignRecipient by resendEmailId
  let matchedRecipient = null;
  if (resendEmailId) {
    matchedRecipient = await prisma.campaignRecipient.findFirst({
      where: { resendEmailId },
    });
  }

  const now = new Date();
  if (matchedRecipient) {
    if (eventType === "email.delivered") {
      await prisma.campaignRecipient.update({
        where: { id: matchedRecipient.id },
        data: { deliveredAt: now, status: "delivered" },
      });
      await prisma.campaign.update({
        where: { id: matchedRecipient.campaignId },
        data: { deliveredCount: { increment: 1 } },
      });
      await prisma.contact.update({
        where: { email: matchedRecipient.email },
        data: { totalDelivered: { increment: 1 } },
      });
    } else if (eventType === "email.opened") {
      await prisma.campaignRecipient.update({
        where: { id: matchedRecipient.id },
        data: {
          openedAt: matchedRecipient.openedAt ? undefined : now,
          status: "opened",
        },
      });
      await prisma.campaign.update({
        where: { id: matchedRecipient.campaignId },
        data: { openedCount: { increment: 1 } },
      });
      await prisma.contact.update({
        where: { email: matchedRecipient.email },
        data: {
          totalOpened: { increment: 1 },
          lastEngagedAt: now,
        },
      });
    } else if (eventType === "email.clicked") {
      const wasAlreadyOpened = !!matchedRecipient.openedAt;
      await prisma.campaignRecipient.update({
        where: { id: matchedRecipient.id },
        data: {
          clickedAt: matchedRecipient.clickedAt ? undefined : now,
          openedAt: wasAlreadyOpened ? undefined : now,
          status: "clicked",
        },
      });
      await prisma.campaign.update({
        where: { id: matchedRecipient.campaignId },
        data: {
          clickedCount: { increment: 1 },
          ...(wasAlreadyOpened ? {} : { openedCount: { increment: 1 } }),
        },
      });
      await prisma.contact.update({
        where: { email: matchedRecipient.email },
        data: {
          totalClicked: { increment: 1 },
          ...(wasAlreadyOpened ? {} : { totalOpened: { increment: 1 } }),
          lastEngagedAt: now,
        },
      });
    } else if (eventType === "email.bounced" || eventType === "email.suppressed" || eventType === "email.failed") {
      await prisma.campaignRecipient.update({
        where: { id: matchedRecipient.id },
        data: {
          bouncedAt: now,
          bounceReason: bounceReason || "Bounced",
          status: "bounced",
        },
      });
      await prisma.campaign.update({
        where: { id: matchedRecipient.campaignId },
        data: { bouncedCount: { increment: 1 } },
      });
      // Mark contact as bounced/suppressed so they are NEVER emailed again
      await prisma.contact.update({
        where: { email: matchedRecipient.email },
        data: {
          status: eventType === "email.suppressed" ? "suppressed" : "bounced",
          bounceReason: bounceReason || "Bounced",
        },
      });
    }
  } else if (recipientEmail && (eventType === "email.bounced" || eventType === "email.suppressed")) {
    // If no campaign match but email bounced, protect contact table
    const cleanEmail = recipientEmail.toLowerCase().trim();
    const existing = await prisma.contact.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      await prisma.contact.update({
        where: { email: cleanEmail },
        data: {
          status: eventType === "email.suppressed" ? "suppressed" : "bounced",
          bounceReason: bounceReason || "Bounced",
        },
      });
    }
  }
}

/**
 * Cancel a campaign and all its pending batches.
 */
export async function cancelCampaignInDb(campaignId: string) {
  await prisma.campaignRecipient.updateMany({
    where: { campaignId, status: "pending" },
    data: { status: "cancelled" },
  });

  return await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "cancelled" },
  });
}
