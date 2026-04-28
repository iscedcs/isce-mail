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

interface ISCECurriculumMailProps {
  message: string;
  courseName: string;
  link: string;
  bannerImage?: string;
}

const ISCECurriculumMail = ({
  message,
  courseName,
  link,
  bannerImage,
}: ISCECurriculumMailProps) => {
  const sanitizedHTML = parse(message);
  const date = new Date().getFullYear();

  return (
    <Tailwind>
      <Html>
        <Head>
          <Preview>ISCE — {courseName} Curriculum</Preview>
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

              {/* Course Banner */}
              <Section className="bg-[#111] text-center px-6 py-10">
                <Text className="text-[26px] font-bold text-white m-0">
                  {courseName}
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

              {/* Body */}
              <Section className="px-8 py-6 text-[#333]">
                {sanitizedHTML}
              </Section>

              {/* CTA */}
              <Section className="text-center pb-8">
                <Button
                  href={link}
                  className="cursor-pointer text-white text-[13px] bg-black"
                  style={{ padding: "12px 28px", margin: "0 auto" }}>
                  Enroll Now
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

export default ISCECurriculumMail;
