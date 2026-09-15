/**
 * email-engine.ts
 *
 * Unified email dispatch and preview engine.
 *
 * Replaces the 22 copy-pasted sendBulkEmail / sendBulkEmailTracked functions
 * spread across 11 per-type mail-action/{type}/mail.ts modules.
 *
 * Key exports:
 *   - renderAndSendBatch()  — builds payloads + sends via product's Resend account
 *   - renderEmailPreview()  — renders one email to HTML string (for /api/preview)
 */

import React from "react";
import { renderAsync } from "@react-email/render";
import { prisma } from "@/lib/prisma";
import type { ResolvedProduct } from "@/lib/product-resolver";
import { getResendForProduct, getSenderForProduct } from "@/lib/product-resolver";
import {
  interpolate,
  sendBatchTracked,
  type BatchRecipient,
  type BatchResult,
  type EmailPayload,
} from "@/lib/mail-action/shared";
import {
  TEMPLATE_REGISTRY,
  isValidTemplateType,
  type DynamicTemplateBaseProps,
} from "@emails/templates/dynamic";

// ---------------------------------------------------------------------------
// Template DB Defaults Resolver
// ---------------------------------------------------------------------------

/**
 * Automatically resolve template props with fallbacks from the database `EmailTemplate`
 * for the given product and template type.
 *
 * This ensures that custom button labels (e.g. "Content Creation Masterclass" for PalmTechniq),
 * banner images, preview text, and custom props defined in the Admin Console automatically
 * manifest in sent emails and live previews without requiring callers to specify them manually.
 */
export async function resolveTemplatePropsWithDbDefaults(
  productId: string,
  templateType: string,
  userProps: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  let dbDefaults: Record<string, unknown> = {};

  try {
    const tpl = await prisma.emailTemplate.findFirst({
      where: {
        productId,
        type: templateType,
        isActive: true,
      },
    });

    if (tpl) {
      dbDefaults = {
        ctaLabel: tpl.defaultCtaLabel || undefined,
        ctaText: tpl.defaultCtaLabel || undefined,
        link: tpl.defaultCtaUrl || undefined,
        bannerImage: tpl.defaultBanner || undefined,
        image: tpl.defaultBanner || undefined,
        previewText: tpl.previewText || undefined,
        ...((tpl.customProps as Record<string, unknown>) || {}),
      };
    }
  } catch (err) {
    console.warn(
      `[email-engine] Could not load template defaults for product ${productId}, type ${templateType}:`,
      err,
    );
  }

  // Filter out undefined, null, or empty string values from dbDefaults
  const cleanDbDefaults: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(dbDefaults)) {
    if (v !== undefined && v !== null && v !== "") {
      cleanDbDefaults[k] = v;
    }
  }

  // Filter out undefined, null, or empty string values from userProps
  const cleanUserProps: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(userProps)) {
    if (v !== undefined && v !== null && v !== "") {
      cleanUserProps[k] = v;
    }
  }

  // Explicit user props override db defaults
  const merged = {
    ...cleanDbDefaults,
    ...cleanUserProps,
  };

  // Cross-alias synchronization:
  // 1. CTA label / text synchronization
  const resolvedCta = merged.ctaText || merged.ctaLabel;
  if (resolvedCta) {
    merged.ctaText = resolvedCta;
    merged.ctaLabel = resolvedCta;
  }

  // 2. Banner image / image synchronization
  const resolvedImage = merged.bannerImage || merged.image;
  if (resolvedImage) {
    merged.bannerImage = resolvedImage;
    merged.image = resolvedImage;
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Main dispatch function
// ---------------------------------------------------------------------------

/**
 * Render and send a batch of emails for a given product + template type.
 *
 * @param product        Resolved product (with decrypted API key and brand tokens).
 * @param templateType   One of the 11 template type slugs (e.g. "welcome", "newsletter").
 * @param recipients     Array of recipient objects with email + name + optional url.
 * @param subject        Campaign subject line (plain text).
 * @param message        Campaign body HTML (may contain {{firstName}} etc. tokens).
 * @param templateProps  Type-specific extra props (e.g. cohortName, startDate, link…).
 * @returns              BatchResult with sent/failed counts and per-email Resend IDs.
 */
export async function renderAndSendBatch(
  product: ResolvedProduct,
  templateType: string,
  recipients: BatchRecipient[],
  subject: string,
  message: string,
  templateProps: Record<string, unknown> = {},
): Promise<BatchResult> {
  if (!isValidTemplateType(templateType)) {
    throw new Error(
      `Unknown template type "${templateType}". Valid types: ${Object.keys(TEMPLATE_REGISTRY).join(", ")}`,
    );
  }

  const effectiveProps = await resolveTemplatePropsWithDbDefaults(
    product.id,
    templateType,
    templateProps,
  );

  const TemplateComponent = TEMPLATE_REGISTRY[templateType];
  const resend = getResendForProduct(product);
  const from = getSenderForProduct(product);

  const payloads: EmailPayload[] = recipients.map((recipient) => {
    const personalizedMessage = interpolate(message, recipient);
    return {
      from,
      to: recipient.email,
      subject,
      react: TemplateComponent({
        product,
        message: personalizedMessage,
        ...effectiveProps,
      } as DynamicTemplateBaseProps & Record<string, unknown>) as React.ReactElement,
    };
  });

  return sendBatchTracked(resend, payloads);
}

// ---------------------------------------------------------------------------
// Preview renderer
// ---------------------------------------------------------------------------

/**
 * Render one email to an HTML string for the /api/preview route.
 * Uses the first recipient's interpolation tokens for preview purposes.
 *
 * Falls back to a dummy preview recipient if none provided.
 *
 * @param product        Resolved product.
 * @param templateType   Template type slug.
 * @param previewData    Template props including 'message' and type-specific fields.
 * @returns              Full HTML string of the rendered email.
 */
export async function renderEmailPreview(
  product: ResolvedProduct,
  templateType: string,
  previewData: Record<string, unknown> = {},
): Promise<string> {
  if (!isValidTemplateType(templateType)) {
    throw new Error(
      `Unknown template type "${templateType}". Valid types: ${Object.keys(TEMPLATE_REGISTRY).join(", ")}`,
    );
  }

  const effectiveProps = await resolveTemplatePropsWithDbDefaults(
    product.id,
    templateType,
    previewData,
  );

  const TemplateComponent = TEMPLATE_REGISTRY[templateType];
  const dummyRecipient: BatchRecipient = {
    email: "preview@example.com",
    name: "Preview User",
    url: "",
  };

  const rawMessage = (effectiveProps.message as string) || (previewData.message as string) || "";
  const personalizedMessage = interpolate(rawMessage, dummyRecipient);

  const element = TemplateComponent({
    product,
    message: personalizedMessage,
    ...effectiveProps,
  } as DynamicTemplateBaseProps & Record<string, unknown>) as React.ReactElement;

  return renderAsync(element);
}

// ---------------------------------------------------------------------------
// Legacy shim — for any callers that use the old per-type mail-action interface.
// (The 11 mail-action/*/mail.ts modules will delegate here.)
// ---------------------------------------------------------------------------

/**
 * @deprecated Use renderAndSendBatch() instead.
 * Provided as a migration shim so the 11 per-type mail-action modules can
 * call through to the new engine without changing their public API.
 */
export async function legacySendBulkEmailTracked(
  basis: string,
  templateType: string,
  recipients: BatchRecipient[],
  subject: string,
  message: string,
  templateProps: Record<string, unknown> = {},
): Promise<BatchResult> {
  // Lazy import to avoid circular deps at module load time
  const { resolveProduct } = await import("@/lib/product-resolver");
  const product = await resolveProduct(basis);
  return renderAndSendBatch(product, templateType, recipients, subject, message, templateProps);
}
