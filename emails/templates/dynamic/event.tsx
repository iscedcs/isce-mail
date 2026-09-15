import React from "react";
import { Button, Img, Section } from "@react-email/components";
import parse from "html-react-parser";
import BrandedEmailShell from "../../components/BrandedEmailShell";
import type { ResolvedProduct } from "@/lib/product-resolver";

export interface DynamicEventMailProps {
  product: ResolvedProduct;
  message: string;
  link: string;
  image?: string;
  previewText?: string;
  ctaText?: string;
  ctaLabel?: string;
}

export default function DynamicEventMail({
  product, message, link, image,
  previewText = `Event invitation from ${product.name}`,
  ctaText, ctaLabel,
}: DynamicEventMailProps) {
  const sanitizedHTML = parse(message);
  const actionText = ctaText || ctaLabel || "Register Now";

  return (
    <BrandedEmailShell product={product} previewText={previewText}>
      {image && (
        <Section style={{ lineHeight: 0, fontSize: 0 }}>
          <Img src={image} alt="Event" width="600"
            style={{ display: "block", width: "100%", maxWidth: "600px", height: "auto" }} />
        </Section>
      )}
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
