import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Hr,
  Section,
  Text,
  Tailwind,
  Preview,
} from "@react-email/components";
import React from "react";
import parse from "html-react-parser";

interface ISCEHolidayMailProps {
  message: string;
  image?: string;
  link?: string;
}

const ISCEHolidayMail = ({ message, image, link }: ISCEHolidayMailProps) => {
  const sanitizedHTML = parse(message);
  const year = new Date().getFullYear();

  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>ISCE - Warm Holiday Wishes</Preview>
        <Body style={{ backgroundColor: "#f3f4f6", margin: 0, padding: 0 }}>
          <Container
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              backgroundColor: "#ffffff",
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}>
            <Section
              style={{
                backgroundColor: "#000000",
                padding: "16px 32px",
                borderBottom: "3px solid #ffffff",
              }}>
              <Img
                src="https://www.isce.tech/_next/image?url=%2Ffi-white.webp&w=128&q=75"
                width="88"
                alt="ISCE"
                style={{ display: "block", margin: "0 auto" }}
              />
            </Section>

            {image && (
              <Section style={{ lineHeight: 0, fontSize: 0 }}>
                <Img
                  src={image}
                  alt="Holiday banner"
                  width="600"
                  style={{
                    display: "block",
                    width: "100%",
                    maxWidth: "600px",
                    height: "auto",
                  }}
                />
              </Section>
            )}

            <Section
              style={{
                backgroundColor: "#f8fafc",
                borderTop: "1px solid #e5e7eb",
                borderBottom: "1px solid #e5e7eb",
                textAlign: "center",
                padding: "14px 24px",
              }}>
              <Text
                style={{
                  margin: "0",
                  color: "#111827",
                  fontSize: "13px",
                  fontWeight: "700",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}>
                Holiday Greetings From ISCE
              </Text>
            </Section>

            <Section
              style={{
                padding: "32px 36px 28px",
                color: "#111827",
                fontSize: "15px",
                lineHeight: "1.7",
              }}>
              {sanitizedHTML}
            </Section>

            {link && (
              <Section style={{ textAlign: "center", padding: "4px 36px 40px" }}>
                <Button
                  href={link}
                  style={{
                    backgroundColor: "#111827",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: "700",
                    textDecoration: "none",
                    padding: "14px 36px",
                    borderRadius: "8px",
                    display: "inline-block",
                  }}>
                  Explore Update
                </Button>
              </Section>
            )}

            <Hr style={{ borderColor: "#e5e7eb", margin: "0" }} />

            <Section
              style={{
                padding: "20px 32px 12px",
                textAlign: "center",
                color: "#6b7280",
              }}>
              <Text style={{ fontSize: "12px", margin: "0" }}>
                Copyright © {year}: ISCE, All Rights Reserved.
              </Text>
              <Text style={{ fontSize: "11px", margin: "8px 0 0" }}>
                <a
                  href="mailto:unsubscribe@isce.tech?subject=Unsubscribe"
                  style={{ color: "#6b7280", textDecoration: "underline" }}>
                  Unsubscribe
                </a>
              </Text>
            </Section>

            <Section
              style={{
                backgroundColor: "#000000",
                padding: "16px 32px 20px",
                textAlign: "center",
              }}>
              <Button
                href="https://www.linkedin.com/company/isceapp/"
                style={{
                  display: "inline-block",
                  backgroundColor: "#ffffff",
                  borderRadius: "50%",
                  padding: "8px",
                  margin: "0 5px",
                }}>
                <Img
                  width="18"
                  height="18"
                  alt="LinkedIn"
                  src="https://cdn-icons-png.flaticon.com/128/4401/4401412.png"
                />
              </Button>
              <Button
                href="https://www.instagram.com/isce.tech?igsh=MXYzc3U2b3EyendzaA=="
                style={{
                  display: "inline-block",
                  backgroundColor: "#ffffff",
                  borderRadius: "50%",
                  padding: "8px",
                  margin: "0 5px",
                }}>
                <Img
                  width="18"
                  height="18"
                  alt="Instagram"
                  src="https://cdn-icons-png.flaticon.com/128/1400/1400829.png"
                />
              </Button>
              <Button
                href="https://x.com/isceapp?t=P4zRw8-h8c0-2H8eGMKJaA&s=09"
                style={{
                  display: "inline-block",
                  backgroundColor: "#ffffff",
                  borderRadius: "50%",
                  padding: "8px",
                  margin: "0 5px",
                }}>
                <Img
                  width="18"
                  height="18"
                  alt="X"
                  src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/x-social-media-black-icon.png"
                />
              </Button>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};

export default ISCEHolidayMail;
