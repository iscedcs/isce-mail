/**
 * prisma/seed-admin.js
 *
 * Seeds the platform administrator account with email: emekignatius5@gmail.com
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required in .env");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Administrator Account...");

  const adminEmail = "emekignatius5@gmail.com";
  const adminUsername = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const rawPassword = process.env.ADMIN_PASSWORD || "isce-admin-2026";
  const passwordHash = hashPassword(rawPassword);

  const existing = await prisma.adminUser.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { username: adminUsername },
        { username: "emekignatius5" },
        { email: "admin@isce.app" },
      ],
    },
  });

  if (existing) {
    const updated = await prisma.adminUser.update({
      where: { id: existing.id },
      data: {
        email: adminEmail,
        username: adminUsername,
        passwordHash,
        role: "super_admin",
      },
    });
    console.log(`✅ Updated existing Administrator in DB (${updated.id}):`);
    console.log(`   Username: ${updated.username}`);
    console.log(`   Email:    ${updated.email}`);
    console.log(`   Role:     ${updated.role}`);
  } else {
    const created = await prisma.adminUser.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        passwordHash,
        role: "super_admin",
      },
    });
    console.log(`✅ Created new Administrator in DB (${created.id}):`);
    console.log(`   Username: ${created.username}`);
    console.log(`   Email:    ${created.email}`);
    console.log(`   Role:     ${created.role}`);
  }

  console.log("🎉 Admin seed complete!");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
