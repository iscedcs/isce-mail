const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('@prisma/client');

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const connectionString = rawUrl.replace(/^['"]|['"]$/g, "").trim();
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log("Updating product plan tiers...");

  // Update PalmTechnIQ to Growth tier (2,500/day)
  const pt = await prisma.product.updateMany({
    where: { slug: "palmtechniq" },
    data: {
      planTier: "growth",
      dailyQuota: 2500,
    },
  });
  console.log("Updated palmtechniq to Growth (2,500/day):", pt.count);

  // Update ISCE to Growth tier (2,500/day)
  const isce = await prisma.product.updateMany({
    where: { slug: "isce" },
    data: {
      planTier: "growth",
      dailyQuota: 2500,
    },
  });
  console.log("Updated isce to Growth (2,500/day):", isce.count);

  // Update Lyncon/Connect to Growth tier (2,500/day)
  const connect = await prisma.product.updateMany({
    where: { slug: "connect" },
    data: {
      planTier: "growth",
      dailyQuota: 2500,
    },
  });
  console.log("Updated connect to Growth (2,500/day):", connect.count);

  const products = await prisma.product.findMany({
    select: { slug: true, name: true, planTier: true, dailyQuota: true },
  });
  console.log("Current DB Products:", products);
}

run().catch(console.error).finally(() => prisma.$disconnect());
