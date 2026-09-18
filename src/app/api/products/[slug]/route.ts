import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { invalidateProductCache } from "@/lib/product-resolver";
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

// GET /api/products/[slug] — fetch single product and its templates
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { slug: rawSlug } = params;
  try {
    const slug = rawSlug.toLowerCase();
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug }, { slug: rawSlug }],
      },
      include: {
        templates: {
          orderBy: { type: "asc" },
        },
        _count: {
          select: { campaigns: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: `Product "${rawSlug}" not found.` },
        { status: 404 },
      );
    }

    // Return sanitized product (no secrets)
    const { resendApiKey, webhookSecret, syncApiKey, ...safeProduct } = product;

    return NextResponse.json({
      success: true,
      product: {
        ...safeProduct,
        hasResendApiKey: Boolean(resendApiKey),
        hasWebhookSecret: Boolean(webhookSecret),
        hasSyncApiKey: Boolean(syncApiKey),
      },
    });
  } catch (err: any) {
    console.error(`[api/products/${rawSlug}] GET failed:`, err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch product" },
      { status: 500 },
    );
  }
}

// PUT /api/products/[slug] — update product details and brand tokens
export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { slug: rawSlug } = params;
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid or missing admin credentials." },
      { status: 401 },
    );
  }

  try {
    const slug = rawSlug.toLowerCase();
    const existing = await prisma.product.findFirst({
      where: { OR: [{ slug }, { slug: rawSlug }] },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Product "${rawSlug}" not found.` },
        { status: 404 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.senderName !== undefined) updateData.senderName = body.senderName.trim();
    if (body.senderEmail !== undefined) updateData.senderEmail = body.senderEmail.trim();
    if (body.replyToEmail !== undefined) updateData.replyToEmail = body.replyToEmail?.trim() || null;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl.trim();
    if (body.websiteUrl !== undefined) updateData.websiteUrl = body.websiteUrl.trim();
    if (body.primaryColor !== undefined) updateData.primaryColor = body.primaryColor;
    if (body.accentColor !== undefined) updateData.accentColor = body.accentColor;
    if (body.buttonTextColor !== undefined) updateData.buttonTextColor = body.buttonTextColor;
    if (body.buttonRadius !== undefined) updateData.buttonRadius = body.buttonRadius;
    if (body.supportEmail !== undefined) updateData.supportEmail = body.supportEmail?.trim() || null;
    if (body.unsubscribeEmail !== undefined) updateData.unsubscribeEmail = body.unsubscribeEmail?.trim() || null;
    if (body.address !== undefined) updateData.address = body.address?.trim() || null;
    if (body.socialLinks !== undefined) updateData.socialLinks = body.socialLinks;
    if (body.syncUrl !== undefined) updateData.syncUrl = body.syncUrl?.trim() || null;
    if (body.planTier !== undefined) updateData.planTier = body.planTier;
    if (body.dailyQuota !== undefined) updateData.dailyQuota = Number(body.dailyQuota);
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

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

    // If new API key is provided, encrypt it
    if (body.resendApiKey && body.resendApiKey.trim()) {
      const cleanedKey = cleanSecret(body.resendApiKey);
      if (cleanedKey) {
        updateData.resendApiKey = encrypt(cleanedKey);
      }
    }
    if (body.webhookSecret !== undefined) {
      const cleanedWebhook = cleanSecret(body.webhookSecret);
      updateData.webhookSecret = cleanedWebhook ? encrypt(cleanedWebhook) : null;
    }
    if (body.syncApiKey !== undefined) {
      const cleanedSync = cleanSecret(body.syncApiKey);
      updateData.syncApiKey = cleanedSync ? encrypt(cleanedSync) : null;
    }

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: updateData,
    });

    // Invalidate caches immediately
    invalidateProductCache(existing.slug);
    if (updated.slug !== existing.slug) {
      invalidateProductCache(updated.slug);
    }

    if (body.resendApiKey && body.resendApiKey.trim()) {
      const cleanedKey = cleanSecret(body.resendApiKey);
      if (cleanedKey) {
        await ensureDomainTrackingEnabled(cleanedKey);
      }
    }

    const { resendApiKey, webhookSecret, syncApiKey, ...safeUpdated } = updated;

    return NextResponse.json({
      success: true,
      product: safeUpdated,
    });
  } catch (err: any) {
    console.error(`[api/products/${rawSlug}] PUT failed:`, err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update product" },
      { status: 500 },
    );
  }
}

// DELETE /api/products/[slug] — soft-delete product (set isActive = false)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { slug: rawSlug } = params;
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid or missing admin credentials." },
      { status: 401 },
    );
  }

  try {
    const slug = rawSlug.toLowerCase();
    const product = await prisma.product.findFirst({
      where: { OR: [{ slug }, { slug: rawSlug }] },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: `Product "${rawSlug}" not found.` },
        { status: 404 },
      );
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { isActive: false },
    });

    invalidateProductCache(product.slug);

    return NextResponse.json({
      success: true,
      message: `Product "${product.name}" deactivated successfully.`,
    });
  } catch (err: any) {
    console.error(`[api/products/${rawSlug}] DELETE failed:`, err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to deactivate product" },
      { status: 500 },
    );
  }
}
