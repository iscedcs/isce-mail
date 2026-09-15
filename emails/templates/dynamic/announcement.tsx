import React from "react";
import { Button, Section } from "@react-email/components";
import parse from "html-react-parser";
import BrandedEmailShell from "../../components/BrandedEmailShell";
import type { ResolvedProduct } from "@/lib/product-resolver";

export interface DynamicAnnouncementMailProps {
  product: ResolvedProduct;
  message: string;
  link: string;
  previewText?: string;
  ctaText?: string;
  ctaLabel?: string;
}

export default function DynamicAnnouncementMail({
  product, message, link,
  previewText = `Announcement from ${product.name}`,
  ctaText, ctaLabel,
}: DynamicAnnouncementMailProps) {
  const sanitizedHTML = parse(message);
  const actionText = ctaText || ctaLabel || "Check It Out";

  return (
    <BrandedEmailShell product={product} previewText={previewText}>
      <Section style={{ padding: "24px 32px", color: "#333333" }}>{sanitizedHTML}</Section>
      <Section style={{ textAlign: "center", paddingBottom: "32px" }}>
        <Button href={link} style={{
          backgroundColor: product.accentColor, color: product.buttonTextColor,
          padding: "12px 28px",
          borderRadius: product.buttonRadius === "full" ? "9999px" : product.buttonRadius === "md" ? "6px" : "0px",
          fontSize: "13px", fontWeight: "600",
        }}>{actionText}</Button>
      </Section>
    </BrandedEmailShell>
  );
}
