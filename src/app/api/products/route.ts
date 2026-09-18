import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { listActiveProducts, invalidateProductCache, PLAN_TIER_QUOTAS } from "@/lib/product-resolver";
import { checkAdminAuth } from "@/lib/admin-auth";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

/**
 * Automatically enable open and click tracking on Resend domains for this product.
 */
async function ensureDomainTrackingEnabled(apiKey: string) {
  try {
    const resend = new Resend(apiKey);
    const domRes = await resend.domains.list();
    const domains = (domRes as any).data?.data || (domRes as any).data || [];
    if (Array.isArray(domains)) {
      for (const dom of domains) {
        if (dom?.id) {
          await resend.domains.update({
            id: dom.id,
            openTracking: true,
            clickTracking: true,
          });
        }
      }
    }
  } catch (err: any) {
    console.warn("[products] Could not auto-enable tracking on domain:", err?.message);
  }
}

const DEFAULT_TEMPLATES = [
  { type: "welcome", name: "Welcome Onboarding", defaultSubject: "Welcome to {{companyName}}!" },
  { type: "newsletter", name: "Newsletter Update", defaultSubject: "{{companyName}} Dispatch: What's New" },
  { type: "announcement", name: "Important Announcement", defaultSubject: "Important Announcement from {{companyName}}" },
  { type: "appreciation", name: "Member Appreciation", defaultSubject: "A Heartfelt Thank You from {{companyName}}" },
  { type: "survey", name: "Feedback Survey", defaultSubject: "We Value Your Feedback — Tell Us What You Think" },
  { type: "event", name: "Event Invitation", defaultSubject: "You're Invited: Upcoming Session with {{companyName}}" },
  { type: "holiday", name: "Holiday Greetings", defaultSubject: "Warm Wishes from the {{companyName}} Family" },
  { type: "promotion", name: "Special Promotion", defaultSubject: "Exclusive Offer Just for You" },
  { type: "curriculum", name: "Curriculum Overview", defaultSubject: "Explore Your Learning Curriculum" },
  { type: "course-promo", name: "Course Promotion & Pricing", defaultSubject: "Enroll Now — Special Tuition Discount" },
  { type: "cohort-welcome", name: "Cohort Welcome & Details", defaultSubject: "Welcome to {{cohortName}}!" },
];

// GET /api/products — list all active products
export async function GET() {
  try {
    const products = await listActiveProducts();
    return NextResponse.json(
      { success: true, products },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (err: any) {
    console.error("[api/products] GET failed:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch products" },
      { status: 500 },
    );
  }
}

// POST /api/products — onboard a new product (Superior / Alpha Admins)
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid or missing admin credentials." },
      { status: 401 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      name,
      slug: rawSlug,
      description,
      senderName,
      senderEmail,
      replyToEmail,
      resendApiKey,
      webhookSecret,
      logoUrl,
      websiteUrl,
      primaryColor = "#000000",
      accentColor = "#000000",
      buttonTextColor = "#ffffff",
      buttonRadius = "full",
      supportEmail,
      unsubscribeEmail,
      address,
      socialLinks,
      syncUrl,
      syncApiKey,
      planTier = "free",
      dailyQuota,
    } = body;

    // Required field validation
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Product name is required." }, { status: 400 });
    }

    const slug = (rawSlug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-");

    if (!slug) {
      return NextResponse.json({ success: false, error: "A valid product slug is required." }, { status: 400 });
    }

    if (!senderName?.trim() || !senderEmail?.trim()) {
      return NextResponse.json(
        { success: false, error: "Sender Name and Sender Email are required." },
        { status: 400 },
      );
    }

    // Crucial requirement: Every product MUST provide its own resendApiKey
    if (!resendApiKey?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "RESEND_API_KEY is mandatory for each product to guarantee domain reputation and sending isolation.",
        },
        { status: 400 },
      );
    }

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `A product with slug "${slug}" already exists.` },
        { status: 409 },
      );
    }

    // Sanitize secret in case user pasted VAR_NAME=value or wrapped in quotes
    const cleanSecret = (val: string | null | undefined): string => {
      if (!val) return "";
      let s = val.trim();
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
      }
      if (s.includes("=") && !s.startsWith("whsec_") && !s.startsWith("re_")) {
        s = s.split("=").slice(1).join("=").trim();
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
          s = s.slice(1, -1).trim();
        }
      }
      return s;
    };

    // Encrypt sensitive credentials
    const cleanResendKey = cleanSecret(resendApiKey);
    if (!cleanResendKey) {
      return NextResponse.json(
        { success: false, error: "A valid Resend API key is required." },
        { status: 400 },
      );
    }
    const encryptedResendKey = encrypt(cleanResendKey);
    const cleanWebhook = cleanSecret(webhookSecret);
    const encryptedWebhookSecret = cleanWebhook ? encrypt(cleanWebhook) : null;
    const cleanSync = cleanSecret(syncApiKey);
    const encryptedSyncKey = cleanSync ? encrypt(cleanSync) : null;

    // Create product
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        replyToEmail: replyToEmail?.trim() || null,
        resendApiKey: encryptedResendKey,
        webhookSecret: encryptedWebhookSecret,
        logoUrl: logoUrl?.trim() || "https://placehold.co/200x50?text=" + encodeURIComponent(name),
        websiteUrl: websiteUrl?.trim() || "https://example.com",
        primaryColor,
        accentColor,
        buttonTextColor,
        buttonRadius,
        supportEmail: supportEmail?.trim() || null,
        unsubscribeEmail: unsubscribeEmail?.trim() || null,
        address: address?.trim() || null,
        socialLinks: socialLinks || undefined,
        syncUrl: syncUrl?.trim() || null,
        syncApiKey: encryptedSyncKey,
        planTier: planTier || "free",
        dailyQuota: dailyQuota ? Number(dailyQuota) : (PLAN_TIER_QUOTAS[planTier] || 100),
        isActive: true,
      },
    });

    // Automatically seed all 11 default templates for this product
    for (const tpl of DEFAULT_TEMPLATES) {
      await prisma.emailTemplate.create({
        data: {
          productId: product.id,
          type: tpl.type,
          name: tpl.name,
          defaultSubject: tpl.defaultSubject.replace("{{companyName}}", product.name),
          previewText: `Updates from ${product.name}`,
          defaultCtaLabel: "Learn More",
          defaultCtaUrl: product.websiteUrl,
        },
      });
    }

    invalidateProductCache(slug);

    // Auto-enable open and click tracking on all Resend domains under this key
    await ensureDomainTrackingEnabled(cleanResendKey);

    // Return sanitized response without secrets
    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        senderName: product.senderName,
        senderEmail: product.senderEmail,
        replyToEmail: product.replyToEmail,
        logoUrl: product.logoUrl,
        websiteUrl: product.websiteUrl,
        primaryColor: product.primaryColor,
        accentColor: product.accentColor,
        buttonTextColor: product.buttonTextColor,
        buttonRadius: product.buttonRadius,
        supportEmail: product.supportEmail,
        unsubscribeEmail: product.unsubscribeEmail,
        address: product.address,
        socialLinks: product.socialLinks,
        syncUrl: product.syncUrl,
        isActive: product.isActive,
        createdAt: product.createdAt,
      },
    });
  } catch (err: any) {
    console.error("[api/products] POST failed:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to onboard product" },
      { status: 500 },
    );
  }
}

// PATCH /api/products?slug=<slug> — update product settings (incl. emailLayout)
export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid or missing admin credentials." },
      { status: 401 },
    );
  }

  try {
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ success: false, error: "slug query param is required." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    // Build a safe update payload — only allow whitelisted fields
    const updateData: Record<string, any> = {};
    if (body.emailLayout !== undefined) updateData.emailLayout = body.emailLayout;
    if (body.primaryColor !== undefined) updateData.primaryColor = body.primaryColor;
    if (body.accentColor !== undefined) updateData.accentColor = body.accentColor;
    if (body.buttonTextColor !== undefined) updateData.buttonTextColor = body.buttonTextColor;
    if (body.buttonRadius !== undefined) updateData.buttonRadius = body.buttonRadius;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;
    if (body.websiteUrl !== undefined) updateData.websiteUrl = body.websiteUrl;
    if (body.senderName !== undefined) updateData.senderName = body.senderName;
    if (body.senderEmail !== undefined) updateData.senderEmail = body.senderEmail;
    if (body.address !== undefined) updateData.address = body.address || null;
    if (body.unsubscribeEmail !== undefined) updateData.unsubscribeEmail = body.unsubscribeEmail || null;
    if (body.supportEmail !== undefined) updateData.supportEmail = body.supportEmail || null;
    if (body.socialLinks !== undefined) updateData.socialLinks = body.socialLinks;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update." }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { slug },
      data: updateData,
    });

    invalidateProductCache(slug);

    return NextResponse.json({
      success: true,
      product: { id: product.id, slug: product.slug, emailLayout: product.emailLayout },
    });
  } catch (err: any) {
    console.error("[api/products] PATCH failed:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update product" },
      { status: 500 },
    );
  }
}

