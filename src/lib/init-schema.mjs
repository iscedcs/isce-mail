import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not defined in environment");
  process.exit(1);
}

const sql = neon(dbUrl);

async function init() {
  console.log("Creating Neon Postgres tables matching schema.prisma...");

  await sql`
    CREATE TABLE IF NOT EXISTS "Contact" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT UNIQUE NOT NULL,
      "firstName" TEXT,
      "status" TEXT NOT NULL DEFAULT 'active',
      "bounceReason" TEXT,
      "totalSent" INT NOT NULL DEFAULT 0,
      "totalDelivered" INT NOT NULL DEFAULT 0,
      "totalOpened" INT NOT NULL DEFAULT 0,
      "totalClicked" INT NOT NULL DEFAULT 0,
      "lastSentAt" TIMESTAMP WITH TIME ZONE,
      "lastEngagedAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "Campaign" (
      "id" TEXT PRIMARY KEY,
      "type" TEXT NOT NULL,
      "basis" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "link" TEXT,
      "templateProps" JSONB,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "totalRecipients" INT NOT NULL DEFAULT 0,
      "sentCount" INT NOT NULL DEFAULT 0,
      "deliveredCount" INT NOT NULL DEFAULT 0,
      "openedCount" INT NOT NULL DEFAULT 0,
      "clickedCount" INT NOT NULL DEFAULT 0,
      "bouncedCount" INT NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "CampaignRecipient" (
      "id" TEXT PRIMARY KEY,
      "campaignId" TEXT NOT NULL REFERENCES "Campaign"("id") ON DELETE CASCADE,
      "contactId" TEXT REFERENCES "Contact"("id") ON DELETE SET NULL,
      "email" TEXT NOT NULL,
      "firstName" TEXT,
      "batchNumber" INT NOT NULL DEFAULT 1,
      "scheduledFor" TIMESTAMP WITH TIME ZONE,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "resendEmailId" TEXT,
      "bounceReason" TEXT,
      "sentAt" TIMESTAMP WITH TIME ZONE,
      "deliveredAt" TIMESTAMP WITH TIME ZONE,
      "openedAt" TIMESTAMP WITH TIME ZONE,
      "clickedAt" TIMESTAMP WITH TIME ZONE,
      "bouncedAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT "CampaignRecipient_campaignId_email_key" UNIQUE ("campaignId", "email")
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "EmailEvent" (
      "id" TEXT PRIMARY KEY,
      "campaignId" TEXT,
      "resendEmailId" TEXT,
      "recipientEmail" TEXT NOT NULL,
      "eventType" TEXT NOT NULL,
      "bounceReason" TEXT,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS "Contact_status_idx" ON "Contact"("status");`;
  await sql`CREATE INDEX IF NOT EXISTS "Campaign_status_idx" ON "Campaign"("status");`;
  await sql`CREATE INDEX IF NOT EXISTS "CampaignRecipient_batch_idx" ON "CampaignRecipient"("campaignId", "batchNumber");`;
  await sql`CREATE INDEX IF NOT EXISTS "CampaignRecipient_resend_idx" ON "CampaignRecipient"("resendEmailId");`;
  await sql`CREATE INDEX IF NOT EXISTS "EmailEvent_resend_idx" ON "EmailEvent"("resendEmailId");`;
  await sql`CREATE INDEX IF NOT EXISTS "EmailEvent_campaign_idx" ON "EmailEvent"("campaignId");`;

  console.log("Tables and indexes successfully verified in Neon Postgres!");
}

init().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
