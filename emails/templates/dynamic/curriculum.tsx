import React from "react";
import { Button, Img, Section, Text } from "@react-email/components";
import parse from "html-react-parser";
import BrandedEmailShell from "../../components/BrandedEmailShell";
import type { ResolvedProduct } from "@/lib/product-resolver";

export interface DynamicCurriculumMailProps {
  product: ResolvedProduct;
  message: string;
  courseName: string;
  link: string;
  pdfUrl?: string;
  bannerImage?: string;
  previewText?: string;
  ctaText?: string;
  ctaLabel?: string;
}

export default function DynamicCurriculumMail({
  product, message, courseName, link, pdfUrl, bannerImage,
  previewText = `${courseName} Curriculum — ${product.name}`,
  ctaText, ctaLabel,
}: DynamicCurriculumMailProps) {
  const sanitizedHTML = parse(message);
  const btnRadius = product.buttonRadius === "full" ? "9999px" : product.buttonRadius === "md" ? "6px" : "0px";

  // One primary action, not two. If a PDF is attached that IS the download, so
  // it takes precedence and the configured link/CTA label step aside — showing
  // both pulled focus in two directions on the same card. When no PDF is set,
  // fall back to the configured link + CTA text as before.
  const hasPdf = Boolean(pdfUrl);
  const actionHref = hasPdf ? pdfUrl! : link;
  const actionText = hasPdf
    ? "Download Curriculum PDF"
    : ctaText || ctaLabel || "View Course Details";
  return (
    <BrandedEmailShell product={product} previewText={previewText}>
      {/* Course title header */}
      <Section style={{ backgroundColor: product.primaryColor, padding: "20px 32px", textAlign: "center" }}>
        <Text style={{ color: "#ffffff", fontSize: "20px", fontWeight: "700", margin: 0 }}>{courseName}</Text>
      </Section>

      {bannerImage && (
        <Section style={{ lineHeight: 0, fontSize: 0 }}>
          <Img src={bannerImage} alt={courseName} width="600"
            style={{ display: "block", width: "100%", maxWidth: "600px", height: "auto" }} />
        </Section>
      )}

      <Section style={{ padding: "24px 32px", color: "#333333" }}>{sanitizedHTML}</Section>

      <Section style={{ textAlign: "center", paddingBottom: "32px" }}>
        <Button href={actionHref} style={{
          backgroundColor: product.accentColor, color: product.buttonTextColor,
          padding: "12px 28px", borderRadius: btnRadius, fontSize: "13px", fontWeight: "600",
        }}>{actionText}</Button>
      </Section>
    </BrandedEmailShell>
  );
}
