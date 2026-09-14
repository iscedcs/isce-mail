/**
 * BrandedEmailShell.tsx
 *
 * Master React Email layout shell that wraps every dynamic template.
 * Supports per-product layout configuration via product.emailLayout:
 *
 *   headerStyle:    "logo-banner" (logo on colored bg) | "logo-only" (logo on white)
 *   footerStyle:    "dark" (primaryColor band, white text) | "light" (white bg, centered dark text)
 *   socialLayout:   "left" | "center"
 *   socialIconSize: 18 | 23 | 28 (px)
 *
 * When emailLayout is null or a key is omitted, shell defaults apply:
 *   headerStyle="logo-banner", footerStyle="dark", socialLayout="left", socialIconSize=18
 */

import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Hr,
  Link,
  Section,
  Text,
  Tailwind,
  Preview,
} from "@react-email/components";
import type { ResolvedProduct } from "@/lib/product-resolver";

const SOCIAL_ICONS: Record<string, string> = {
  linkedin: "https://cdn-icons-png.flaticon.com/128/4401/4401412.png",
  instagram: "https://cdn-icons-png.flaticon.com/128/1400/1400829.png",
  twitter: "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/x-social-media-black-icon.png",
  facebook: "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/facebook-app-round-white-icon.png",
  slack: "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/slack-icon.png",
  youtube: "https://cdn-icons-png.flaticon.com/128/1384/1384060.png",
};

export interface BrandedEmailShellProps {
  product: ResolvedProduct;
  previewText?: string;
  children: React.ReactNode;
}

export default function BrandedEmailShell({ product, previewText, children }: BrandedEmailShellProps) {
  const year = new Date().getFullYear();
  const layout = product.emailLayout ?? {};

  const headerStyle = layout.headerStyle ?? "logo-banner";
  const footerStyle = layout.footerStyle ?? "dark";
  const socialLayout = layout.socialLayout ?? "left";
  const iconSize = layout.socialIconSize ?? 18;

  const socialLinks = product.socialLinks ?? {};
  const socialEntries = Object.entries(socialLinks).filter(([key]) => key in SOCIAL_ICONS);

  const btnRadius = product.buttonRadius === "none" ? "0px" : product.buttonRadius === "md" ? "6px" : "9999px";
  const accentBg = product.accentColor;
  const primaryBg = product.primaryColor;
  const iconPadV = Math.round((iconSize - 2) / 2);
  const iconPadH = Math.round(iconSize / 2);

  const SocialRow = ({ center }: { center?: boolean }) =>
    socialEntries.length > 0 ? (
      <Section style={{ paddingBottom: "32px", paddingTop: "12px", textAlign: center ? "center" : "left", paddingLeft: center ? "0" : "24px" }}>
        {socialEntries.map(([platform, url]) => (
          <Button key={platform} href={url} style={{ backgroundColor: accentBg, margin: "4px", padding: `${iconPadV}px ${iconPadH}px`, borderRadius: btnRadius, display: "inline-block" }}>
            <Img width={iconSize} height={iconSize} alt={platform} src={SOCIAL_ICONS[platform]} />
          </Button>
        ))}
      </Section>
    ) : null;

  const Header = headerStyle === "logo-only" ? (
    <Section style={{ backgroundColor: "#ffffff", padding: "20px 24px", borderBottom: "1px solid #e5e5e5" }}>
      <Img src={product.logoUrl} width="160" height="60" alt={product.name} style={{ display: "block", margin: "0 auto", objectFit: "contain" }} />
    </Section>
  ) : (
    <Section style={{ backgroundColor: primaryBg, padding: "12px 24px" }}>
      <Img src={product.logoUrl} width="160" height="60" alt={product.name} style={{ display: "block", margin: "0 auto", objectFit: "contain", paddingTop: "8px", paddingBottom: "8px" }} />
    </Section>
  );

  const LightFooter = (
    <>
      <Hr style={{ borderColor: "#e5e5e5", margin: "32px 0 0" }} />
      <Section style={{ backgroundColor: "#ffffff", padding: "20px 32px 0", textAlign: "center" }}>
        <Text style={{ color: "#333333", fontSize: "12px", margin: "0 0 4px" }}>
          Copyright &copy; {year} <span style={{ color: accentBg, fontWeight: 700 }}>{product.name}</span>, All Rights Reserved.
        </Text>
        {product.address && (
          <Text style={{ color: "#555555", fontSize: "11px", margin: "4px 0" }}>
            Mailing Address: {product.address}
          </Text>
        )}
        {product.unsubscribeEmail && (
          <Text style={{ margin: "8px 0 0" }}>
            <Link href={`mailto:${product.unsubscribeEmail}?subject=Unsubscribe`} style={{ color: "#888888", fontSize: "11px" }}>
              Unsubscribe
            </Link>
          </Text>
        )}
      </Section>
      <Section style={{ backgroundColor: "#ffffff" }}>
        <SocialRow center />
      </Section>
    </>
  );

  const DarkFooter = (
    <>
      <Hr style={{ borderColor: "#e5e5e5", margin: "32px 0 0" }} />
      <Section style={{ backgroundColor: primaryBg, padding: "20px 32px", color: "#ffffff" }}>
        <Text style={{ color: "#ffffff", fontSize: "12px", margin: "0 0 4px 0" }}>
          Copyright &copy; {year} {product.name}, All Rights Reserved.
        </Text>
        {product.address && (
          <Text style={{ color: "#aaaaaa", fontSize: "11px", margin: "4px 0" }}>
            {product.address}
          </Text>
        )}
        {product.unsubscribeEmail && (
          <Text style={{ margin: "8px 0 0 0" }}>
            <a href={`mailto:${product.unsubscribeEmail}?subject=Unsubscribe`} style={{ color: "#aaaaaa", fontSize: "11px" }}>
              Unsubscribe
            </a>
          </Text>
        )}
      </Section>
      <Section style={{ backgroundColor: primaryBg }}>
        <SocialRow center={socialLayout === "center"} />
      </Section>
    </>
  );

  return (
    <Tailwind>
      <Html>
        <Head />
        {previewText && <Preview>{previewText}</Preview>}
        <Body className="w-full bg-[#f5f5f5] m-0 p-0">
          <Container className="w-full max-w-[600px] mx-auto bg-white">
            {Header}
            {children}
            {footerStyle === "light" ? LightFooter : DarkFooter}
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}