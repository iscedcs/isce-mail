import React from "react";
import { Button, Img, Section, Text } from "@react-email/components";
import parse from "html-react-parser";
import BrandedEmailShell from "../../components/BrandedEmailShell";
import type { ResolvedProduct } from "@/lib/product-resolver";

export interface DynamicCoursePromoMailProps {
  product: ResolvedProduct;
  message: string;
  courseName: string;
  link: string;
  price?: string;
  originalPrice?: string;
  deadline?: string;
  bannerImage?: string;
  previewText?: string;
}

export default function DynamicCoursePromoMail({
  product, message, courseName, link, price, originalPrice, deadline, bannerImage,
  previewText = `Limited offer: ${courseName} — ${product.name}`,
}: DynamicCoursePromoMailProps) {
  const sanitizedHTML = parse(message);
  const btnRadius = product.buttonRadius === "full" ? "9999px" : product.buttonRadius === "md" ? "6px" : "0px";
  return (
    <BrandedEmailShell product={product} previewText={previewText}>
      {bannerImage && (
        <Section style={{ lineHeight: 0, fontSize: 0 }}>
          <Img src={bannerImage} alt={courseName} width="600"
            style={{ display: "block", width: "100%", maxWidth: "600px", height: "auto" }} />
        </Section>
      )}

      {/* Course + Pricing Block */}
      <Section style={{ backgroundColor: product.primaryColor, padding: "20px 32px", textAlign: "center" }}>
        <Text style={{ color: "#ffffff", fontSize: "20px", fontWeight: "700", margin: "0 0 4px 0" }}>{courseName}</Text>
        {(price || originalPrice) && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
            {originalPrice && (
              <Text style={{ color: "#aaaaaa", fontSize: "14px", textDecoration: "line-through", margin: 0 }}>{originalPrice}</Text>
            )}
            {price && (
              <Text style={{ color: product.accentColor === "#ffffff" ? "#ffffff" : product.buttonTextColor, fontSize: "22px", fontWeight: "800", margin: 0 }}>{price}</Text>
            )}
          </div>
        )}
        {deadline && (
          <Text style={{ color: "#ffcc00", fontSize: "12px", margin: "4px 0 0 0" }}>⏰ Offer ends {deadline}</Text>
        )}
      </Section>

      <Section style={{ padding: "24px 32px", color: "#333333" }}>{sanitizedHTML}</Section>

      <Section style={{ textAlign: "center", paddingBottom: "32px" }}>
        <Button href={link} style={{
          backgroundColor: product.accentColor, color: product.buttonTextColor,
          padding: "12px 32px", borderRadius: btnRadius, fontSize: "14px", fontWeight: "700",
        }}>Enroll Now</Button>
      </Section>
    </BrandedEmailShell>
  );
}
