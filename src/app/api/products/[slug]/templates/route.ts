import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// GET /api/products/[slug]/templates — list templates for product
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { slug: rawSlug } = params;
  try {
    const slug = rawSlug.toLowerCase();
    const product = await prisma.product.findFirst({
      where: { OR: [{ slug }, { slug: rawSlug }] },
      select: { id: true, name: true, slug: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: `Product "${rawSlug}" not found.` },
        { status: 404 },
      );
    }

    const templates = await prisma.emailTemplate.findMany({
      where: { productId: product.id },
      orderBy: { type: "asc" },
    });

    return NextResponse.json({
      success: true,
      product,
      templates,
    });
  } catch (err: any) {
    console.error(`[api/products/${rawSlug}/templates] GET failed:`, err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch templates" },
      { status: 500 },
    );
  }
}

// PUT /api/products/[slug]/templates — customize template defaults
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
    const product = await prisma.product.findFirst({
      where: { OR: [{ slug }, { slug: rawSlug }] },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: `Product "${rawSlug}" not found.` },
        { status: 404 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      type,
      name,
      description,
      defaultSubject,
      previewText,
      defaultBanner,
      defaultCtaLabel,
      defaultCtaUrl,
      starterBody,
      customProps,
      stylingOverrides,
      isActive,
    } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: "Template 'type' is required." },
        { status: 400 },
      );
    }

    const updated = await prisma.emailTemplate.upsert({
      where: {
        productId_type: {
          productId: product.id,
          type,
        },
      },
      update: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(defaultSubject !== undefined && { defaultSubject }),
        ...(previewText !== undefined && { previewText }),
        ...(defaultBanner !== undefined && { defaultBanner }),
        ...(defaultCtaLabel !== undefined && { defaultCtaLabel }),
        ...(defaultCtaUrl !== undefined && { defaultCtaUrl }),
        ...(starterBody !== undefined && { starterBody }),
        ...(customProps !== undefined && { customProps }),
        ...(stylingOverrides !== undefined && { stylingOverrides }),
        ...(isActive !== undefined && { isActive }),
      },
      create: {
        productId: product.id,
        type,
        name: name || type,
        description,
        defaultSubject,
        previewText,
        defaultBanner,
        defaultCtaLabel,
        defaultCtaUrl,
        starterBody,
        customProps,
        stylingOverrides,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      template: updated,
    });
  } catch (err: any) {
    console.error(`[api/products/${rawSlug}/templates] PUT failed:`, err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update template" },
      { status: 500 },
    );
  }
}
