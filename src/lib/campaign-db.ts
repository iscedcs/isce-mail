import { prisma } from "@/lib/prisma";
import { resolveProduct } from "@/lib/product-resolver";
import { renderAndSendBatch } from "@/lib/email-engine";
import type { IBasis } from "@/lib/mail-action/shared";

async function dispatchEmail(
  type: string,
  basis: string,
  subject: string,
  message: string,
  link?: string,
  templateProps: Record<string, any> = {},
  recipients: { email: string; name?: string; firstname?: string }[] = [],
): Promise<{ sent: number; failed: number; ids: { resendEmailId: string; email: string }[]; errors?: string[] }> {
  const product = await resolveProduct(basis);
  const formattedRecipients = recipients.map((r) => ({
    email: r.email.trim().toLowerCase(),
    name: r.firstname || r.name || "",
  }));

  // Build merged templateProps for the engine (link is a common prop)
  const mergedProps = { link, ...templateProps };

  return renderAndSendBatch(
    product,
    type,
    formattedRecipients,
    subject,
    message,
    mergedProps,
  );
}

export interface RecipientInput {
  email: string;
  name?: string;
  firstname?: string;
  url?: string;
}

export interface CreateCampaignParams {
  type: string;
  basis: string; // ProductSlug — matches Product.slug or legacy "ISCE" / "PalmTechniq"
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

  // 0. Resolve product (validates slug exists, loads branding/API key)
  let resolvedProductId: string | null = null;
  try {
    const product = await resolveProduct(params.basis);
    // DB-seeded products have a real cuid; legacy env-fallbacks return the slug as id
    if (product.id !== product.slug) {
      resolvedProductId = product.id;
    }
  } catch {
    console.warn(`[campaign-db] Could not resolve product "${params.basis}" — proceeding without productId.`);
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

  // Query globally bounced/suppressed contacts (hard bounces block all products)
  const badContacts = await prisma.contact.findMany({
    where: {
      email: { in: rawList.map((r) => r.email) },
      status: { in: ["bounced", "suppressed"] },
    },
    select: { email: true, status: true, bounceReason: true },
  });
  const badEmailSet = new Set(badContacts.map((b: { email: string }) => b.email));

  // Query product-specific unsubscribes (only if product is in DB)
  let productUnsubscribed = new Set<string>();
  if (resolvedProductId) {
    try {
      const unsubscribedStatuses = await prisma.contactProductStatus.findMany({
        where: {
          productId: resolvedProductId,
          status: "unsubscribed",
          contact: { email: { in: rawList.map((r) => r.email) } },
        },
        include: { contact: { select: { email: true } } },
      });
      productUnsubscribed = new Set(unsubscribedStatuses.map((s) => s.contact.email));
    } catch {
      // Non-fatal if contact status table isn't populated yet
    }
  }

  const validRecipients = rawList.filter((r) => !badEmailSet.has(r.email) && !productUnsubscribed.has(r.email));

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
      productId: resolvedProductId,
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

    let dispatchResult: Awaited<ReturnType<typeof dispatchEmail>>;
    try {
      dispatchResult = await dispatchEmail(
        params.type,
        params.basis,
        params.subject,
        params.message,
        params.link,
        params.templateProps,
        batch1.recipients,
      );
    } catch (dispatchErr) {
      // Revert Batch 1 recipients to "scheduled" (scheduledFor = now) so the scheduler
      // can retry on the next tick. Without this, any throw (e.g. decryption error,
      // Resend network failure) leaves recipients stuck in "sending" forever.
      console.error("[campaign-db] Batch 1 immediate dispatch failed — reverting to scheduled:", dispatchErr);
      await prisma.campaignRecipient.updateMany({
        where: { campaignId, batchNumber: 1, status: "sending", resendEmailId: null },
        data: { status: "scheduled", scheduledFor: new Date() },
      });
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "scheduled" },
      });
      throw dispatchErr;
    }

    batch1SentCount = dispatchResult.sent;
    batch1.sentAt = new Date().toISOString();

    const idMap = new Map(dispatchResult.ids.map((item) => [item.email.toLowerCase(), item.resendEmailId]));
    const successfulEmails = dispatchResult.ids.map((item) => item.email.toLowerCase());

    // Update recipients with status & resend IDs in parallel
    await Promise.all(
      batch1.recipients.map((r) => {
        const resendId = idMap.get(r.email.toLowerCase()) || null;
        return prisma.campaignRecipient.updateMany({
          where: { campaignId, email: r.email },
          data: {
            status: resendId ? "sent" : "failed",
            sentAt: resendId ? new Date() : null,
            resendEmailId: resendId,
          },
        });
      }),
    );

    // Update contacts totalSent in bulk ONLY for successfully sent recipients
    if (successfulEmails.length > 0) {
      await prisma.contact.updateMany({
        where: { email: { in: successfulEmails } },
        data: {
          totalSent: { increment: 1 },
          lastSentAt: new Date(),
        },
      });
    }

    const allSentNow = batches.length === 1;
    const campaignStatus = allSentNow
      ? dispatchResult.sent > 0
        ? "completed"
        : "failed"
      : "sending";

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sentCount: dispatchResult.sent,
        status: campaignStatus,
      },
    });

    if (dispatchResult.sent === 0 && dispatchResult.failed > 0) {
      const errDetail = dispatchResult.errors?.length
        ? dispatchResult.errors.join("; ")
        : "Resend failed to deliver the batch.";
      throw new Error(`Email dispatch failed: ${errDetail}`);
    }
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
        status: "scheduled", // will be recalculated below after all recipients are collected
        recipients: [],
      });
    }
    batchMap.get(r.batchNumber).recipients.push(r);
  }

  // Recalculate batch status from recipients (consistent with listCampaignsFromDb)
  Array.from(batchMap.values()).forEach((batch) => {
    const recs = batch.recipients;
    batch.status = recs.every((r: any) =>
      ["sent", "delivered", "opened", "clicked", "bounced"].includes(r.status),
    )
      ? "sent"
      : recs.some((r: any) => r.status === "sending")
        ? "sending"
        : "scheduled";
  });

  return {
    campaign,
    batches: Array.from(batchMap.values()),
  };
}

/**
 * Dispatches a specific queued batch (e.g. Batch 2 or Batch 3) via Resend.
 * Uses atomic status claiming to prevent duplicate sends across concurrent ticks/workers.
 */
export async function dispatchScheduledBatch(campaignId: string, batchNumber: number) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) throw new Error("Campaign not found");

  const claimResult = await prisma.campaignRecipient.updateMany({
    where: {
      campaignId,
      batchNumber,
      resendEmailId: null,
      status: { notIn: ["delivered", "opened", "clicked", "bounced", "suppressed"] },
    },
    data: {
      status: "sending",
    },
  });

  if (claimResult.count === 0) {
    return { sent: 0, message: "No pending or scheduled recipients found for this batch." };
  }

  // 2. Fetch only the recipients we successfully claimed
  const claimedRecipients = await prisma.campaignRecipient.findMany({
    where: {
      campaignId,
      batchNumber,
      status: "sending",
      resendEmailId: null,
    },
  });

  if (claimedRecipients.length === 0) {
    return { sent: 0, message: "No un-dispatched recipients found for this batch." };
  }

  let result: { sent: number; failed: number; ids: { resendEmailId: string; email: string }[]; errors?: string[] };

  try {
    result = await dispatchEmail(
      campaign.type,
      campaign.basis,
      campaign.subject,
      campaign.message,
      campaign.link || undefined,
      (campaign.templateProps as Record<string, any>) || {},
      claimedRecipients.map((r: any) => ({ email: r.email, name: r.firstName || undefined })),
    );
  } catch (err) {
    // If dispatch fails completely, revert claimed recipients back to "scheduled" so it can be retried
    await prisma.campaignRecipient.updateMany({
      where: {
        campaignId,
        batchNumber,
        status: "sending",
        resendEmailId: null,
      },
      data: {
        status: "scheduled",
      },
    });
    throw err;
  }

  const idMap = new Map(result.ids.map((item) => [item.email.toLowerCase(), item.resendEmailId]));

  for (const r of claimedRecipients) {
    const resendId = idMap.get(r.email.toLowerCase()) || null;
    await prisma.campaignRecipient.updateMany({
      where: { campaignId, email: r.email },
      data: {
        status: resendId ? "sent" : "failed", // mark failed — not scheduled (no scheduledFor date to retry on)
        sentAt: resendId ? new Date() : null,
        resendEmailId: resendId,
      },
    });

    if (resendId) {
      await prisma.contact.update({
        where: { email: r.email },
        data: {
          totalSent: { increment: 1 },
          lastSentAt: new Date(),
        },
      });
    }
  }

  if (result.sent > 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sentCount: { increment: result.sent },
      },
    });
  }

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

  if (result.sent === 0 && result.failed > 0) {
    const errDetail = result.errors?.length
      ? result.errors.join("; ")
      : "Resend failed to deliver any emails in this batch.";
    throw new Error(errDetail);
  }

  return { sent: result.sent, ids: result.ids, errors: result.errors };
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

export async function cancelCampaignInDb(campaignId: string) {
  await prisma.campaignRecipient.updateMany({
    where: { campaignId, status: { in: ["pending", "scheduled"] } },
    data: { status: "cancelled" },
  });

  return await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "cancelled" },
  });
}
