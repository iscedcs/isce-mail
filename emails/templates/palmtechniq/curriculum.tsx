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

interface PtCurriculumMailProps {
  message: string;
  courseName: string;
  link: string;
  bannerImage?: string;
}

const PtCurriculumMail = ({
  message,
  courseName,
  link,
  bannerImage,
}: PtCurriculumMailProps) => {
  const sanitizedHTML = parse(message);
  const date = new Date().getFullYear();

  return (
    <Tailwind>
      <Html>
        <Head>
          <Preview>PalmTechnIQ — {courseName} Curriculum</Preview>
          <Body className="w-full bg-[#f5f5f5]">
            <Container className="w-full max-w-[600px] mx-auto bg-white">
              {/* Header */}
              <Section className="bg-[#021A1A]">
                <Img
                  src="https://www.palmtechniq.com/assets/palmtechniqlogo.png"
                  width="200"
                  alt="PalmTechnIQ"
                  style={{ display: "block", margin: "12px auto" }}
                />
              </Section>

              {/* Course Banner */}
              <Section
                style={{
                  backgroundImage: "url(https://isce-mail.vercel.app/static/PalmTechnIQ.png)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                className="px-8 py-12 text-center">
                <Text
                  className="text-[28px] font-bold text-white m-0"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>
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
                  className="cursor-pointer rounded-full text-white text-[13px] bg-green-600"
                  style={{ padding: "12px 28px", margin: "0 auto" }}>
                  Enroll Now
                </Button>
              </Section>

              <Hr className="border-[#e5e5e5]" />

              {/* Footer */}
              <Section className="text-center text-[#888] px-6 py-4">
                <Text className="text-[12px] m-0">
                  Copyright © {date} PalmTechnIQ, All Rights Reserved.
                </Text>
                <Text className="text-[11px] mt-1">
                  1st Floor, (Festac Tower) Chicken Republic Building, 22Rd,
                  Festac Town, Lagos, Nigeria.
                </Text>
                <Text className="text-[11px] mt-2">
                  <a
                    href="mailto:unsubscribe@palmtechniq.com?subject=Unsubscribe"
                    style={{ color: "#888" }}>
                    Unsubscribe
                  </a>
                </Text>
              </Section>

              {/* Social Icons */}
              <Section className="py-6 text-center bg-[#021A1A]">
                <Button
                  href="https://www.facebook.com/profile.php?id=61561459226438&mibextid=ZbWKwL"
                  className="m-2 rounded-full bg-green-600 p-2">
                  <Img
                    width="20"
                    height="20"
                    alt="Facebook"
                    src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/facebook-app-round-white-icon.png"
                  />
                </Button>
                <Button
                  href="https://www.linkedin.com/company/palmtechniq/"
                  className="m-2 rounded-full bg-green-600 p-2">
                  <Img
                    width="20"
                    height="20"
                    alt="LinkedIn"
                    src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/linkedin-app-icon.png"
                  />
                </Button>
                <Button
                  href="https://www.instagram.com/palmtechniq/"
                  className="m-2 rounded-full bg-green-600 p-2">
                  <Img
                    width="20"
                    height="20"
                    alt="Instagram"
                    src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/ig-instagram-icon.png"
                  />
                </Button>
                <Button
                  href="https://app.slack.com/client/T076LDT7109/C0764SE3VB7"
                  className="m-2 rounded-full bg-green-600 p-2">
                  <Img
                    width="20"
                    height="20"
                    alt="Slack"
                    src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/slack-icon.png"
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

export default PtCurriculumMail;
