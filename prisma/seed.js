/**
 * prisma/seed.js
 *
 * Seeds initial Products (ISCE, PalmTechniq) and all 11 default EmailTemplates per product.
 * Also backfills existing Campaign.productId references by matching basis -> slug.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");

// Load .env manually
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
        if (!val.startsWith('"') && !val.startsWith("'")) {
          const hashIdx = val.indexOf("#");
          if (hashIdx !== -1) val = val.slice(0, hashIdx).trim();
        } else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

function encryptSecret(plaintext) {
  if (!plaintext) return plaintext;
  const rawKey = process.env.ENCRYPTION_KEY || "ec1ba3bedea8bbb4efd196202ac0d0f4a4cd4b0638fb7bbc914edb4292084a0d";
  const key = Buffer.from(rawKey, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString("base64url");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required in .env");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const TEMPLATE_DEFAULTS = [
  {
    type: "welcome",
    name: "Welcome Onboarding",
    description: "Introductory welcome email sent to new community members or customers",
    defaultSubject: "Welcome to {{companyName}}!",
    previewText: "We are thrilled to have you join us.",
    defaultCtaLabel: "Get Started",
    defaultCtaUrl: "https://example.com/welcome",
  },
  {
    type: "newsletter",
    name: "Newsletter Update",
    description: "Periodic newsletter or product update dispatch",
    defaultSubject: "{{companyName}} Dispatch: What's New",
    previewText: "Here are the top stories and product updates this month.",
    defaultCtaLabel: "Read More",
    defaultCtaUrl: "https://example.com/blog",
  },
  {
    type: "announcement",
    name: "Important Announcement",
    description: "Platform updates, policy changes, and urgent news",
    defaultSubject: "Important Announcement from {{companyName}}",
    previewText: "Please review these important updates regarding our platform.",
    defaultCtaLabel: "Learn More",
    defaultCtaUrl: "https://example.com/announcement",
  },
  {
    type: "appreciation",
    name: "Member Appreciation",
    description: "Gratitude notes, milestone celebrations, and recognition",
    defaultSubject: "A Heartfelt Thank You from {{companyName}}",
    previewText: "We wanted to take a moment to celebrate you.",
    defaultCtaLabel: "View Milestones",
    defaultCtaUrl: "https://example.com/appreciation",
  },
  {
    type: "survey",
    name: "Feedback Survey",
    description: "Customer satisfaction and product discovery surveys",
    defaultSubject: "We Value Your Feedback — Tell Us What You Think",
    previewText: "Take 2 minutes to share your thoughts and help us improve.",
    defaultCtaLabel: "Take Survey",
    defaultCtaUrl: "https://example.com/survey",
  },
  {
    type: "event",
    name: "Event Invitation",
    description: "Webinar, workshop, or community meetup invites",
    defaultSubject: "You're Invited: Upcoming Session with {{companyName}}",
    previewText: "Save your seat for our upcoming live event.",
    defaultCtaLabel: "RSVP Now",
    defaultCtaUrl: "https://example.com/events",
  },
  {
    type: "holiday",
    name: "Holiday & Season Greetings",
    description: "Holiday celebrations, new year wishes, and seasonal greetings",
    defaultSubject: "Warm Wishes from the {{companyName}} Family",
    previewText: "Celebrating this special season with you.",
    defaultCtaLabel: "Visit Us",
    defaultCtaUrl: "https://example.com",
  },
  {
    type: "promotion",
    name: "Special Offer / Promotion",
    description: "Discount campaigns, seasonal deals, and feature promotions",
    defaultSubject: "Exclusive Offer Just for You",
    previewText: "Don't miss this limited-time offer.",
    defaultCtaLabel: "Claim Discount",
    defaultCtaUrl: "https://example.com/offer",
  },
  {
    type: "curriculum",
    name: "Course Curriculum Overview",
    description: "Syllabus outline and curriculum breakdown email",
    defaultSubject: "Explore Your Learning Curriculum",
    previewText: "Check out what you will be mastering in this program.",
    defaultCtaLabel: "Download Syllabus",
    defaultCtaUrl: "https://example.com/syllabus",
    customProps: {
      courseName: "Full-Stack Software Engineering",
      pdfUrl: "https://example.com/curriculum.pdf",
    },
  },
  {
    type: "course-promo",
    name: "Course Promotion & Pricing",
    description: "Discounted tuition, price breakdown, and enrollment deadline",
    defaultSubject: "Enroll Now — Special Tuition Discount Ending Soon",
    previewText: "Supercharge your career with practical tech skills.",
    defaultCtaLabel: "Enroll Today",
    defaultCtaUrl: "https://example.com/enroll",
    customProps: {
      courseTitle: "Full-Stack Bootcamp",
      originalPrice: "₦150,000",
      discountPrice: "₦89,999",
      deadline: "End of Month",
    },
  },
  {
    type: "cohort-welcome",
    name: "Cohort Welcome & Details",
    description: "Cohort onboarding with schedule, mentor details, and community link",
    defaultSubject: "Welcome to {{cohortName}}!",
    previewText: "Your onboarding details and orientation schedule are inside.",
    defaultCtaLabel: "Join Community",
    defaultCtaUrl: "https://example.com/community",
    customProps: {
      cohortName: "Cohort 1 — Next-Gen Tech",
      startDate: "Coming Soon",
      mentorName: "Lead Instructor",
      communityLink: "https://example.com/community",
    },
  },
];

async function seed() {
  console.log("🌱 Starting dynamic multi-product database seed...");

  // 1. Seed ISCE
  const isceResendKey = process.env.ISCE_RESEND_API_KEY || "re_dummy_isce_key";
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  const isce = await prisma.product.upsert({
    where: { slug: "isce" },
    update: {
      name: "ISCE Tech",
      senderName: "ISCE Team",
      senderEmail: "hello@isce.tech",
      resendApiKey: encryptSecret(isceResendKey),
      webhookSecret: webhookSecret ? encryptSecret(webhookSecret) : null,
      logoUrl: "https://www.isce.tech/images/fi-white.webp",
      websiteUrl: "https://www.isce.tech",
      primaryColor: "#000000",
      accentColor: "#000000",
      buttonTextColor: "#ffffff",
      buttonRadius: "full",
      unsubscribeEmail: "unsubscribe@isce.tech",
      socialLinks: {
        linkedin: "https://www.linkedin.com/company/isceapp/",
        instagram: "https://www.instagram.com/isce.tech?igsh=MXYzc3U2b3EyendzaA==",
        twitter: "https://x.com/isceapp?t=P4zRw8-h8c0-2H8eGMKJaA&s=09",
      },
      isActive: true,
    },
    create: {
      name: "ISCE Tech",
      slug: "isce",
      description: "ISCE digital technology solutions and smart card ecosystem",
      senderName: "ISCE Team",
      senderEmail: "hello@isce.tech",
      resendApiKey: encryptSecret(isceResendKey),
      webhookSecret: webhookSecret ? encryptSecret(webhookSecret) : null,
      logoUrl: "https://www.isce.tech/images/fi-white.webp",
      websiteUrl: "https://www.isce.tech",
      primaryColor: "#000000",
      accentColor: "#000000",
      buttonTextColor: "#ffffff",
      buttonRadius: "full",
      unsubscribeEmail: "unsubscribe@isce.tech",
      socialLinks: {
        linkedin: "https://www.linkedin.com/company/isceapp/",
        instagram: "https://www.instagram.com/isce.tech?igsh=MXYzc3U2b3EyendzaA==",
        twitter: "https://x.com/isceapp?t=P4zRw8-h8c0-2H8eGMKJaA&s=09",
      },
      isActive: true,
    },
  });
  console.log(`✅ Seeded Product: ISCE Tech (${isce.id})`);

  // 2. Seed PalmTechniq
  const ptResendKey = process.env.PALMTECHNIQ_RESEND_API_KEY || "re_dummy_pt_key";
  const ptSyncKey = process.env.PALMTECHNIQ_SYNC_API_KEY;

  const palmtechniq = await prisma.product.upsert({
    where: { slug: "palmtechniq" },
    update: {
      name: "PalmTechnIQ",
      senderName: "PalmTechnIQ",
      senderEmail: "support@palmtechniq.com",
      resendApiKey: encryptSecret(ptResendKey),
      webhookSecret: webhookSecret ? encryptSecret(webhookSecret) : null,
      logoUrl: "https://www.palmtechniq.com/assets/palmtechniqlogo.png",
      websiteUrl: "https://www.palmtechniq.com",
      primaryColor: "#021A1A",
      accentColor: "#16a34a",
      buttonTextColor: "#ffffff",
      buttonRadius: "full",
      unsubscribeEmail: "unsubscribe@palmtechniq.com",
      address: "1st Floor, (Festac Tower) Chicken Republic Building, 22Rd, Festac Town, Lagos, Nigeria.",
      socialLinks: {
        facebook: "https://www.facebook.com/profile.php?id=61561459226438&mibextid=ZbWKwL",
        linkedin: "https://www.linkedin.com/company/palmtechniq/",
        instagram: "https://www.instagram.com/palmtechniq/",
        slack: "https://app.slack.com/client/T076LDT7109/C0764SE3VB7",
      },
      syncUrl: process.env.PALMTECHNIQ_SYNC_BASE_URL || null,
      syncApiKey: ptSyncKey ? encryptSecret(ptSyncKey) : null,
      isActive: true,
    },
    create: {
      name: "PalmTechnIQ",
      slug: "palmtechniq",
      description: "PalmTechnIQ tech education, live bootcamps, and cohort mentoring",
      senderName: "PalmTechnIQ",
      senderEmail: "support@palmtechniq.com",
      resendApiKey: encryptSecret(ptResendKey),
      webhookSecret: webhookSecret ? encryptSecret(webhookSecret) : null,
      logoUrl: "https://www.palmtechniq.com/assets/palmtechniqlogo.png",
      websiteUrl: "https://www.palmtechniq.com",
      primaryColor: "#021A1A",
      accentColor: "#16a34a",
      buttonTextColor: "#ffffff",
      buttonRadius: "full",
      unsubscribeEmail: "unsubscribe@palmtechniq.com",
      address: "1st Floor, (Festac Tower) Chicken Republic Building, 22Rd, Festac Town, Lagos, Nigeria.",
      socialLinks: {
        facebook: "https://www.facebook.com/profile.php?id=61561459226438&mibextid=ZbWKwL",
        linkedin: "https://www.linkedin.com/company/palmtechniq/",
        instagram: "https://www.instagram.com/palmtechniq/",
        slack: "https://app.slack.com/client/T076LDT7109/C0764SE3VB7",
      },
      syncUrl: process.env.PALMTECHNIQ_SYNC_BASE_URL || null,
      syncApiKey: ptSyncKey ? encryptSecret(ptSyncKey) : null,
      isActive: true,
    },
  });
  console.log(`✅ Seeded Product: PalmTechnIQ (${palmtechniq.id})`);

  // 3. Seed GADA
  const gadaResendKey = process.env.GADA_RESEND_API_KEY || "re_gada_default_isolated_key";

  const gada = await prisma.product.upsert({
    where: { slug: "gada" },
    update: {
      name: "GADA",
      senderName: "GADA",
      senderEmail: "hello@gada.isce.app",
      replyToEmail: "support@gada.isce.app",
      resendApiKey: encryptSecret(gadaResendKey),
      webhookSecret: webhookSecret ? encryptSecret(webhookSecret) : null,
      logoUrl: "https://gada.isce.app/resources/logo.png",
      websiteUrl: "https://gada.isce.app",
      primaryColor: "#000000",
      accentColor: "#059669",
      buttonTextColor: "#ffffff",
      buttonRadius: "full",
      supportEmail: "support@gada.isce.app",
      unsubscribeEmail: "unsubscribe@gada.isce.app",
      address: "AMG Workspace, 22 Road, Festac, Lagos, Nigeria",
      socialLinks: {
        website: "https://gada.isce.app",
      },
      isActive: true,
    },
    create: {
      name: "GADA",
      slug: "gada",
      description: "Discover events, get tickets, and host experiences on GADA.",
      senderName: "GADA",
      senderEmail: "hello@gada.isce.app",
      replyToEmail: "support@gada.isce.app",
      resendApiKey: encryptSecret(gadaResendKey),
      webhookSecret: webhookSecret ? encryptSecret(webhookSecret) : null,
      logoUrl: "https://gada.isce.app/resources/logo.png",
      websiteUrl: "https://gada.isce.app",
      primaryColor: "#000000",
      accentColor: "#059669",
      buttonTextColor: "#ffffff",
      buttonRadius: "full",
      supportEmail: "support@gada.isce.app",
      unsubscribeEmail: "unsubscribe@gada.isce.app",
      address: "AMG Workspace, 22 Road, Festac, Lagos, Nigeria",
      socialLinks: {
        website: "https://gada.isce.app",
      },
      isActive: true,
    },
  });
  console.log(`✅ Seeded Product: GADA (${gada.id})`);

  // 4. Seed Templates for all products
  for (const product of [isce, palmtechniq, gada]) {
    for (const tpl of TEMPLATE_DEFAULTS) {
      const isGada = product.slug === "gada";
      const subject = isGada && tpl.type === "event"
        ? "You're Invited: Upcoming Experience on GADA"
        : isGada && tpl.type === "welcome"
        ? "Welcome to GADA — Discover & Host Unforgettable Experiences"
        : tpl.defaultSubject.replace("{{companyName}}", product.name);

      const preview = isGada && tpl.type === "event"
        ? "Reserve your spot and get your tickets on GADA."
        : isGada && tpl.type === "welcome"
        ? "Your all-in-one platform for events, tickets, and community moments."
        : tpl.previewText;

      const ctaLabel = isGada && tpl.type === "event"
        ? "View Event & Get Tickets"
        : tpl.defaultCtaLabel;

      const ctaUrl = tpl.defaultCtaUrl
        ? tpl.defaultCtaUrl.replace("https://example.com", product.websiteUrl)
        : product.websiteUrl;

      await prisma.emailTemplate.upsert({
        where: {
          productId_type: {
            productId: product.id,
            type: tpl.type,
          },
        },
        update: {
          name: tpl.name,
          description: tpl.description,
          defaultSubject: subject,
          previewText: preview,
          defaultCtaLabel: ctaLabel,
          defaultCtaUrl: ctaUrl,
          customProps: tpl.customProps || undefined,
        },
        create: {
          productId: product.id,
          type: tpl.type,
          name: tpl.name,
          description: tpl.description,
          defaultSubject: subject,
          previewText: preview,
          defaultCtaLabel: ctaLabel,
          defaultCtaUrl: ctaUrl,
          customProps: tpl.customProps || undefined,
        },
      });
    }
    console.log(`✅ Seeded 11 templates for ${product.name}`);
  }

  // 4. Backfill existing campaigns
  const campaignsToBackfill = await prisma.campaign.findMany({
    where: { productId: null },
    select: { id: true, basis: true },
  });

  let backfilled = 0;
  for (const c of campaignsToBackfill) {
    const basisLower = (c.basis || "").toLowerCase();
    let targetProductId = null;
    if (basisLower === "isce") {
      targetProductId = isce.id;
    } else if (basisLower === "palmtechniq") {
      targetProductId = palmtechniq.id;
    } else if (basisLower === "gada") {
      targetProductId = gada.id;
    }

    if (targetProductId) {
      await prisma.campaign.update({
        where: { id: c.id },
        data: { productId: targetProductId },
      });
      backfilled++;
    }
  }

  console.log(`✅ Backfilled ${backfilled} legacy campaigns with product IDs.`);
  console.log("🎉 Seed finished successfully!");
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
