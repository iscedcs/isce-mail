import React from "react";
import { Button, Img, Section, Text } from "@react-email/components";
import parse from "html-react-parser";
import BrandedEmailShell from "../../components/BrandedEmailShell";
import type { ResolvedProduct } from "@/lib/product-resolver";

export interface DynamicCohortWelcomeMailProps {
  product: ResolvedProduct;
  message: string;
  cohortName: string;
  startDate: string;
  mentorName: string;
  communityLink: string;
  link: string;
  bannerImage?: string;
  previewText?: string;
}

export default function DynamicCohortWelcomeMail({
  product, message, cohortName, startDate, mentorName, communityLink, link, bannerImage,
  previewText = `Welcome to ${cohortName} — ${product.name}`,
}: DynamicCohortWelcomeMailProps) {
  const sanitizedHTML = parse(message);
  const btnRadius = product.buttonRadius === "full" ? "9999px" : product.buttonRadius === "md" ? "6px" : "0px";
  return (
    <BrandedEmailShell product={product} previewText={previewText}>
      {bannerImage && (
        <Section style={{ lineHeight: 0, fontSize: 0 }}>
          <Img src={bannerImage} alt={cohortName} width="600"
            style={{ display: "block", width: "100%", maxWidth: "600px", height: "auto" }} />
        </Section>
      )}

      {/* Cohort info cards */}
      <Section style={{ backgroundColor: product.primaryColor, padding: "20px 32px" }}>
        <Text style={{ color: "#ffffff", fontSize: "22px", fontWeight: "800", margin: "0 0 12px 0", textAlign: "center" }}>
          Welcome to {cohortName}! 🎉
        </Text>
        <table width="100%" cellPadding="6" style={{ color: "#ffffff", fontSize: "13px" }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: "600", paddingRight: "8px" }}>📅 Start Date:</td>
              <td>{startDate}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: "600", paddingRight: "8px" }}>👤 Your Mentor:</td>
              <td>{mentorName}</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={{ padding: "24px 32px", color: "#333333" }}>{sanitizedHTML}</Section>

      {/* Two CTAs */}
      <Section style={{ textAlign: "center", paddingBottom: "12px" }}>
        <Button href={link} style={{
          backgroundColor: product.accentColor, color: product.buttonTextColor,
          padding: "12px 28px", borderRadius: btnRadius, fontSize: "13px", fontWeight: "600",
        }}>Access Your Dashboard</Button>
      </Section>
      <Section style={{ textAlign: "center", paddingBottom: "32px" }}>
        <Button href={communityLink} style={{
          backgroundColor: "transparent", color: product.accentColor,
          border: `2px solid ${product.accentColor}`,
          padding: "10px 28px", borderRadius: btnRadius, fontSize: "13px", fontWeight: "600",
        }}>Join Community</Button>
      </Section>
    </BrandedEmailShell>
  );
}
