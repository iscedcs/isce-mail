import { prisma } from "../src/lib/prisma.ts";
import { fetchPalmTechniqRecipients } from "../src/lib/palmtechniq-users.ts";
import { Resend } from "resend";

async function main() {
  console.log("=== Starting Campaign & Batch Recovery ===");

  // 1. Fetch PalmTechniq active recipients
  const syncData = await fetchPalmTechniqRecipients();
  const allRecipients = syncData.recipients;
  console.log(`Fetched ${allRecipients.length} PalmTechniq recipients.`);

  // 2. Fetch today's email events from DB
  const todayStart = new Date("2026-09-09T00:00:00.000Z");
  const eventsToday = await prisma.emailEvent.findMany({
    where: { createdAt: { gte: todayStart } },
    orderBy: { createdAt: "desc" },
  });
  console.log(`Found ${eventsToday.length} email events from today.`);

  // Map email -> resendEmailId & statuses
  const sentMap = new Map();
  for (const e of eventsToday) {
    if (e.recipientEmail) {
      const email = e.recipientEmail.toLowerCase().trim();
      if (!sentMap.has(email)) {
        sentMap.set(email, {
          resendEmailId: e.resendEmailId,
          delivered: false,
          opened: false,
          clicked: false,
          bounced: false,
          bounceReason: null,
        });
      }
      const entry = sentMap.get(email);
      if (e.eventType === "email.delivered") entry.delivered = true;
      if (e.eventType === "email.opened") entry.opened = true;
      if (e.eventType === "email.clicked") entry.clicked = true;
      if (e.eventType === "email.bounced" || e.eventType === "email.suppressed") {
        entry.bounced = true;
        entry.bounceReason = e.bounceReason;
      }
    }
  }

  console.log(`Identified ${sentMap.size} unique recipients who received Batch 1 today.`);

  // 3. Separate Batch 1 vs remaining
  const batch1 = [];
  const remaining = [];

  for (const r of allRecipients) {
    const email = r.email.toLowerCase().trim();
    if (sentMap.has(email)) {
      batch1.push({
        ...r,
        eventInfo: sentMap.get(email),
      });
    } else {
      remaining.push(r);
    }
  }

  console.log(`Batch 1 count: ${batch1.length}`);
  console.log(`Remaining recipients: ${remaining.length}`);

  // Split remaining into Batch 2 (100) and Batch 3 (35)
  const batch2Recipients = remaining.slice(0, 100);
  const batch3Recipients = remaining.slice(100);

  console.log(`Batch 2 scheduled: ${batch2Recipients.length}`);
  console.log(`Batch 3 scheduled: ${batch3Recipients.length}`);

  // 4. Fetch details from one sent email in Resend
  const sampleResendId = batch1[0]?.eventInfo?.resendEmailId;
  let subject = "Stop using AI tools you don't understand.";
  let message = "";
  let link = "https://www.palmtechniq.com";
  let image = "";

  if (sampleResendId && process.env.PALMTECHNIQ_RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.PALMTECHNIQ_RESEND_API_KEY);
      const emailDetail = await resend.emails.get(sampleResendId);
      if (emailDetail.data) {
        if (emailDetail.data.subject) subject = emailDetail.data.subject;
        if (emailDetail.data.text) message = emailDetail.data.text;
      }
    } catch (err) {
      console.warn("Could not fetch Resend email details, using defaults:", err.message);
    }
  }

  // 5. Create the Campaign in Neon DB
  const sendTime = new Date("2026-09-09T14:42:15.000Z");
  const tomorrowTime = new Date("2026-09-10T14:42:00.000Z");
  const dayAfterTime = new Date("2026-09-11T14:42:00.000Z");

  let deliveredCount = 0;
  let openedCount = 0;
  let clickedCount = 0;
  let bouncedCount = 0;

  for (const b of batch1) {
    if (b.eventInfo.delivered) deliveredCount++;
    if (b.eventInfo.opened) openedCount++;
    if (b.eventInfo.clicked) clickedCount++;
    if (b.eventInfo.bounced) bouncedCount++;
  }

  const campaign = await prisma.campaign.create({
    data: {
      type: "promotion",
      basis: "PalmTechniq",
      subject,
      message,
      link,
      templateProps: {
        type: "promotion",
        basis: "PalmTechniq",
        subject,
        message,
        link,
        image,
      },
      status: "sending",
      totalRecipients: allRecipients.length,
      sentCount: batch1.length,
      deliveredCount,
      openedCount,
      clickedCount,
      bouncedCount,
      createdAt: sendTime,
    },
  });

  console.log(`Created Campaign in Neon Postgres with ID: ${campaign.id}`);

  // 6. Bulk create CampaignRecipients
  const recipientData = [];

  // Batch 1
  for (const r of batch1) {
    let status = "sent";
    if (r.eventInfo.clicked) status = "clicked";
    else if (r.eventInfo.opened) status = "opened";
    else if (r.eventInfo.delivered) status = "delivered";
    else if (r.eventInfo.bounced) status = "bounced";

    recipientData.push({
      campaignId: campaign.id,
      email: r.email.toLowerCase().trim(),
      firstName: r.name || null,
      batchNumber: 1,
      scheduledFor: sendTime,
      sentAt: sendTime,
      deliveredAt: r.eventInfo.delivered ? sendTime : null,
      openedAt: r.eventInfo.opened ? sendTime : null,
      clickedAt: r.eventInfo.clicked ? sendTime : null,
      bouncedAt: r.eventInfo.bounced ? sendTime : null,
      bounceReason: r.eventInfo.bounceReason,
      resendEmailId: r.eventInfo.resendEmailId || null,
      status,
    });
  }

  // Batch 2
  for (const r of batch2Recipients) {
    recipientData.push({
      campaignId: campaign.id,
      email: r.email.toLowerCase().trim(),
      firstName: r.name || null,
      batchNumber: 2,
      scheduledFor: tomorrowTime,
      status: "scheduled",
    });
  }

  // Batch 3
  for (const r of batch3Recipients) {
    recipientData.push({
      campaignId: campaign.id,
      email: r.email.toLowerCase().trim(),
      firstName: r.name || null,
      batchNumber: 3,
      scheduledFor: dayAfterTime,
      status: "scheduled",
    });
  }

  await prisma.campaignRecipient.createMany({
    data: recipientData,
  });
  console.log(`Inserted ${recipientData.length} CampaignRecipient rows across 3 batches.`);

  // 7. Link all today's EmailEvents to this campaign
  const eventIds = eventsToday.map((e) => e.id);
  const updateResult = await prisma.emailEvent.updateMany({
    where: { id: { in: eventIds } },
    data: { campaignId: campaign.id },
  });
  console.log(`Linked ${updateResult.count} EmailEvent rows to Campaign ${campaign.id}.`);

  // 8. Bulk upsert contacts into Contact table
  const contactData = allRecipients.map((r) => ({
    email: r.email.toLowerCase().trim(),
    firstName: r.name || null,
    status: sentMap.get(r.email.toLowerCase().trim())?.bounced ? "bounced" : "active",
    bounceReason: sentMap.get(r.email.toLowerCase().trim())?.bounceReason || null,
    totalSent: sentMap.has(r.email.toLowerCase().trim()) ? 1 : 0,
    totalDelivered: sentMap.get(r.email.toLowerCase().trim())?.delivered ? 1 : 0,
    totalOpened: sentMap.get(r.email.toLowerCase().trim())?.opened ? 1 : 0,
    totalClicked: sentMap.get(r.email.toLowerCase().trim())?.clicked ? 1 : 0,
    lastSentAt: sentMap.has(r.email.toLowerCase().trim()) ? sendTime : null,
  }));

  await prisma.contact.createMany({
    data: contactData,
    skipDuplicates: true,
  });
  console.log(`Synced ${contactData.length} contacts into Contact table.`);

  console.log("=== Recovery Completed Successfully! ===");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Recovery failed:", err);
    process.exit(1);
  });
