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
import React from "react";
import parse from "html-react-parser";

interface ISCECoursePromoMailProps {
  message: string;
  courseTitle: string;
  originalPrice: string;
  discountPrice: string;
  deadline: string;
  link: string;
  bannerImage?: string;
}

const ISCECoursePromoMail = ({
  message,
  courseTitle,
  originalPrice,
  discountPrice,
  deadline,
  link,
  bannerImage,
}: ISCECoursePromoMailProps) => {
  const sanitizedHTML = parse(message);
  const date = new Date().getFullYear();

  return (
    <Tailwind>
      <Html>
        <Head>
          <Preview>
            🎓 {courseTitle} — Limited-time offer: {discountPrice}
          </Preview>
          <Body className="w-full bg-[#f5f5f5]">
            <Container className="w-full max-w-[600px] mx-auto bg-white">
              {/* Header */}
              <Section className="bg-[#000]">
                <Img
                  className="mx-auto py-3"
                  src="https://www.isce.tech/_next/image?url=%2Ffi-white.webp&w=128&q=75"
                  width="80"
                  height="80"
                />
              </Section>

              {/* Course Title Banner */}
              <Section className="bg-[#111] px-8 py-10 text-center">
                <Text className="text-[26px] font-bold text-white m-0 leading-tight">
                  {courseTitle}
                </Text>
              </Section>

              {/* Banner Image */}
              {bannerImage && (
                <Section className="w-full">
                  <Link href={link} style={{ display: "block" }}>
                    <Img
                      src={bannerImage}
                      width="600"
                      style={{ display: "block", width: "100%" }}
                      alt="Course banner"
                    />
                  </Link>
                </Section>
              )}

              {/* Message Body */}
              <Section className="px-8 py-6 text-[#333]">
                {sanitizedHTML}
              </Section>

              {/* Price Card */}
              <Section
                className="text-center py-10 px-8"
                style={{ backgroundColor: "#0f0f0f" }}>
                <Text
                  className="text-[11px] uppercase font-semibold m-0 mb-1"
                  style={{ color: "#9ca3af", letterSpacing: "0.15em" }}>
                  ✦ Special Offer ✦
                </Text>
                <Text
                  className="text-[44px] font-bold m-0 mt-3"
                  style={{ color: "#ffffff", lineHeight: "1.1" }}>
                  {discountPrice}
                </Text>
                <Text
                  className="text-[16px] mt-2 mb-0"
                  style={{ color: "#6b7280", textDecoration: "line-through" }}>
                  {originalPrice}
                </Text>
                {deadline && (
                  <Text
                    className="text-[13px] font-semibold text-white mt-5 mb-0"
                    style={{
                      display: "inline-block",
                      backgroundColor: "#dc2626",
                      padding: "7px 20px",
                      borderRadius: "24px",
                    }}>
                    ⏰ Offer ends: {deadline}
                  </Text>
                )}
              </Section>

              {/* CTA */}
              <Section
                className="text-center pt-6 pb-10"
                style={{ backgroundColor: "#0f0f0f" }}>
                <Button
                  href={link}
                  className="cursor-pointer text-white text-[14px] font-semibold"
                  style={{
                    padding: "14px 40px",
                    margin: "0 auto",
                    backgroundColor: "#111",
                    border: "1px solid #444",
                  }}>
                  Claim This Offer →
                </Button>
              </Section>

              <Hr className="border-[#e5e5e5]" />

              {/* Footer */}
              <Section className="text-left pt-5 px-10 bg-black text-white">
                <Text className="text-[12px]">
                  Copyright © {date}: ISCE, All Rights Reserved.
                </Text>
                <Text className="text-[11px] mt-2">
                  <a
                    href="mailto:unsubscribe@isce.tech?subject=Unsubscribe"
                    style={{ color: "#aaa" }}>
                    Unsubscribe
                  </a>
                </Text>
              </Section>

              {/* Social Icons */}
              <Section className="pb-8 px-10 bg-black text-left">
                <Button
                  href="https://www.linkedin.com/company/isceapp/"
                  className="bg-white m-[5px] py-[8px] px-[10px] rounded-full">
                  <Img
                    width="18"
                    height="18"
                    alt="LinkedIn"
                    src="https://cdn-icons-png.flaticon.com/128/4401/4401412.png"
                  />
                </Button>
                <Button
                  href="https://www.instagram.com/isce.tech"
                  className="bg-white m-[5px] py-[8px] px-[10px] rounded-full">
                  <Img
                    width="18"
                    height="18"
                    alt="Instagram"
                    src="https://cdn-icons-png.flaticon.com/128/1400/1400829.png"
                  />
                </Button>
              </Section>
            </Container>
          </Body>
        </Head>
      </Html>
    </Tailwind>
  );
};

export default ISCECoursePromoMail;
