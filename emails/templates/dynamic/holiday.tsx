import React from "react";
import { Img, Section } from "@react-email/components";
import parse from "html-react-parser";
import BrandedEmailShell from "../../components/BrandedEmailShell";
import type { ResolvedProduct } from "@/lib/product-resolver";

export interface DynamicHolidayMailProps {
  product: ResolvedProduct;
  message: string;
  link?: string;
  image?: string;
  previewText?: string;
}

export default function DynamicHolidayMail({
  product, message, image,
  previewText = `Season's greetings from ${product.name}`,
}: DynamicHolidayMailProps) {
  const sanitizedHTML = parse(message);
  return (
    <BrandedEmailShell product={product} previewText={previewText}>
      {image && (
        <Section style={{ lineHeight: 0, fontSize: 0 }}>
          <Img src={image} alt="Holiday" width="600"
            style={{ display: "block", width: "100%", maxWidth: "600px", height: "auto" }} />
        </Section>
      )}
      <Section style={{ padding: "24px 32px", color: "#333333" }}>{sanitizedHTML}</Section>
    </BrandedEmailShell>
  );
}
