/**
 * One-time recovery script: reset all stuck "sending" Batch 1 recipients
 * (those with no resendEmailId) to "scheduled" with scheduledFor = NOW
 * so the scheduler picks them up immediately on next tick.
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Load .env
const envPath = path.resolve(__dirname, "..", ".env");
const lines = fs.readFileSync(envPath, "utf-8").split("\n");
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (!val.startsWith('"') && !val.startsWith("'")) {
      const hashIdx = val.indexOf(" #");
      if (hashIdx !== -1) val = val.slice(0, hashIdx).trim();
    } else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find all campaigns with stuck "sending" Batch 1 recipients
  const stuckCampaigns = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT cr."campaignId", cr."batchNumber", COUNT(*)::int as count
    FROM "CampaignRecipient" cr
    WHERE cr.status = 'sending' AND cr."resendEmailId" IS NULL
    GROUP BY cr."campaignId", cr."batchNumber"
  `);
  
  console.log("Stuck batches found:", stuckCampaigns);

  if (stuckCampaigns.length === 0) {
    console.log("No stuck recipients found. All clear!");
    return;
  }

  // Reset them all to "scheduled" with scheduledFor = now
  const result = await prisma.campaignRecipient.updateMany({
    where: {
      status: "sending",
      resendEmailId: null,
    },
    data: {
      status: "scheduled",
      scheduledFor: new Date(),
    },
  });

  console.log(`✅ Reset ${result.count} stuck recipients to "scheduled" (scheduledFor = now)`);
  console.log("The scheduler will pick them up on the next tick (within 60s after server restart).");

  await prisma.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
