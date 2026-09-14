import React from "react";
import { Button, Img, Link, Section, Text } from "@react-email/components";
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
}

export default function DynamicCurriculumMail({
  product, message, courseName, link, pdfUrl, bannerImage,
  previewText = `${courseName} Curriculum — ${product.name}`,
}: DynamicCurriculumMailProps) {
  const sanitizedHTML = parse(message);
  const btnRadius = product.buttonRadius === "full" ? "9999px" : product.buttonRadius === "md" ? "6px" : "0px";
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

      <Section style={{ textAlign: "center", paddingBottom: "16px" }}>
        <Button href={link} style={{
          backgroundColor: product.accentColor, color: product.buttonTextColor,
          padding: "12px 28px", borderRadius: btnRadius, fontSize: "13px", fontWeight: "600",
        }}>View Course Details</Button>
      </Section>

      {pdfUrl && (
        <Section style={{ textAlign: "center", paddingBottom: "32px" }}>
          <Link href={pdfUrl} style={{ color: product.accentColor, fontSize: "13px", fontWeight: "600" }}>
            📄 Download Curriculum PDF
          </Link>
        </Section>
      )}
    </BrandedEmailShell>
  );
}
