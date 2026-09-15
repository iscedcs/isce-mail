/**
 * Dynamic email template — Welcome
 * Renders inside BrandedEmailShell with product branding injected.
 */
import React from "react";
import { Button, Img, Section, Text } from "@react-email/components";
import parse from "html-react-parser";
import BrandedEmailShell from "../../components/BrandedEmailShell";
import type { ResolvedProduct } from "@/lib/product-resolver";

export interface DynamicWelcomeMailProps {
  product: ResolvedProduct;
  message: string;
  link: string;
  bannerImage?: string;
  previewText?: string;
  ctaText?: string;
  ctaLabel?: string;
}

export default function DynamicWelcomeMail({
  product,
  message,
  link,
  bannerImage,
  previewText = `Welcome to ${product.name}!`,
  ctaText,
  ctaLabel,
}: DynamicWelcomeMailProps) {
  const sanitizedHTML = parse(message);
  const actionText = ctaText || ctaLabel || `Visit ${product.name}`;

  return (
    <BrandedEmailShell product={product} previewText={previewText}>
      {/* Banner image */}
      {bannerImage && (
        <Section style={{ lineHeight: 0, fontSize: 0 }}>
          <Img
            src={bannerImage}
            alt={`Welcome to ${product.name}`}
            width="600"
            style={{ display: "block", width: "100%", maxWidth: "600px", height: "auto" }}
          />
        </Section>
      )}

      {/* Message body */}
      <Section style={{ padding: "24px 32px", color: "#333333" }}>
        {sanitizedHTML}
      </Section>

      {/* CTA */}
      <Section style={{ textAlign: "center", paddingBottom: "32px" }}>
        <Button
          href={link}
          style={{
            backgroundColor: product.accentColor,
            color: product.buttonTextColor,
            padding: "12px 28px",
            borderRadius:
              product.buttonRadius === "full"
                ? "9999px"
                : product.buttonRadius === "md"
                ? "6px"
                : "0px",
            fontSize: "13px",
            fontWeight: "600",
            textDecoration: "none",
          }}
        >
          {actionText}
        </Button>
      </Section>
    </BrandedEmailShell>
  );
}
