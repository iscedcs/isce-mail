import React from "react";
import { Button, Img, Section } from "@react-email/components";
import parse from "html-react-parser";
import BrandedEmailShell from "../../components/BrandedEmailShell";
import type { ResolvedProduct } from "@/lib/product-resolver";

export interface DynamicHolidayMailProps {
  product: ResolvedProduct;
  message: string;
  link?: string;
  image?: string;
  previewText?: string;
  ctaText?: string;
  ctaLabel?: string;
}

export default function DynamicHolidayMail({
  product, message, link, image,
  previewText = `Season's greetings from ${product.name}`,
  ctaText, ctaLabel,
}: DynamicHolidayMailProps) {
  const sanitizedHTML = parse(message);
  const actionText = ctaText || ctaLabel || `Visit ${product.name}`;
  return (
    <BrandedEmailShell product={product} previewText={previewText}>
      {image && (
        <Section style={{ lineHeight: 0, fontSize: 0 }}>
          <Img src={image} alt="Holiday" width="600"
            style={{ display: "block", width: "100%", maxWidth: "600px", height: "auto" }} />
        </Section>
      )}
      <Section style={{ padding: "24px 32px", color: "#333333" }}>{sanitizedHTML}</Section>
      {link && (
        <Section style={{ textAlign: "center", paddingBottom: "32px" }}>
          <Button href={link} style={{
            backgroundColor: product.accentColor, color: product.buttonTextColor,
            padding: "12px 28px",
            borderRadius: product.buttonRadius === "full" ? "9999px" : product.buttonRadius === "md" ? "6px" : "0px",
            fontSize: "13px", fontWeight: "600",
          }}>{actionText}</Button>
        </Section>
      )}
    </BrandedEmailShell>
  );
}

