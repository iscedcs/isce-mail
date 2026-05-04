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

interface PtNewsLetterMailProps {
  message: string;
  image?: string;
}

const buildPreviewText = (message: string, fallback: string) => {
  const plain = message
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) return fallback;
  const teaser = plain.slice(0, 95).trim();
  return plain.length > 95 ? `${teaser}...` : teaser;
};

const PtNewsLetterMail = ({ message, image }: PtNewsLetterMailProps) => {
  const sanitizedHTML = parse(message);
  const year = new Date().getFullYear();
  const previewText = buildPreviewText(message, "PalmTechnIQ Newsletter");

  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>{previewText}</Preview>
        <Body style={{ backgroundColor: "#f0f2f0", margin: 0, padding: 0 }}>
          <Container
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              backgroundColor: "#ffffff",
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}>
            <Section
              style={{
                backgroundColor: "#021A1A",
                padding: "16px 32px",
                borderBottom: "3px solid #16a34a",
              }}>
              <Img
                src="https://www.palmtechniq.com/assets/palmtechniqlogo.png"
                width="160"
                alt="PalmTechnIQ"
                style={{ display: "block", margin: "0 auto" }}
              />
            </Section>

            {image && (
              <Section style={{ lineHeight: 0, fontSize: 0 }}>
                <Img
                  src={image}
                  alt="Newsletter banner"
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
                backgroundColor: "#f7fff9",
                borderTop: "1px solid #dcfce7",
                borderBottom: "1px solid #dcfce7",
                textAlign: "center",
                padding: "14px 24px",
              }}>
              <Text
                style={{
                  margin: "0",
                  color: "#166534",
                  fontSize: "13px",
                  fontWeight: "700",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}>
                PalmTechnIQ Newsletter
              </Text>
            </Section>

            <Section
              style={{
                padding: "32px 36px 28px",
                color: "#1a1a1a",
                fontSize: "15px",
                lineHeight: "1.7",
              }}>
              {sanitizedHTML}
            </Section>

            <Hr style={{ borderColor: "#e5e7eb", margin: "0" }} />

            <Section
              style={{
                padding: "20px 32px 12px",
                textAlign: "center",
                color: "#9ca3af",
              }}>
              <Text style={{ fontSize: "12px", margin: "0" }}>
                Copyright © {year} PalmTechnIQ, All Rights Reserved.
              </Text>
              <Text style={{ fontSize: "11px", margin: "6px 0 0" }}>
                Mailing Address: 1st Floor, (Festac Tower) Chicken Republic
                Building, 22Rd, Festac Town, Lagos, Nigeria.
              </Text>
              <Text style={{ fontSize: "11px", margin: "8px 0 0" }}>
                <a
                  href="mailto:unsubscribe@palmtechniq.com?subject=Unsubscribe"
                  style={{ color: "#9ca3af", textDecoration: "underline" }}>
                  Unsubscribe
                </a>
              </Text>
            </Section>

            <Section
              style={{
                backgroundColor: "#021A1A",
                padding: "16px 32px 20px",
                textAlign: "center",
              }}>
              <Button
                href="https://www.facebook.com/profile.php?id=61561459226438&mibextid=ZbWKwL"
                style={{
                  display: "inline-block",
                  backgroundColor: "#16a34a",
                  borderRadius: "50%",
                  padding: "8px",
                  margin: "0 5px",
                }}>
                <Img
                  width="20"
                  height="20"
                  alt="Facebook"
                  src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/facebook-app-round-white-icon.png"
                />
              </Button>
              <Button
                href="https://www.linkedin.com/company/palmtechniq/"
                style={{
                  display: "inline-block",
                  backgroundColor: "#16a34a",
                  borderRadius: "50%",
                  padding: "8px",
                  margin: "0 5px",
                }}>
                <Img
                  width="20"
                  height="20"
                  alt="LinkedIn"
                  src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/linkedin-app-icon.png"
                />
              </Button>
              <Button
                href="https://www.instagram.com/palmtechniq/"
                style={{
                  display: "inline-block",
                  backgroundColor: "#16a34a",
                  borderRadius: "50%",
                  padding: "8px",
                  margin: "0 5px",
                }}>
                <Img
                  width="20"
                  height="20"
                  alt="Instagram"
                  src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/ig-instagram-icon.png"
                />
              </Button>
              <Button
                href="https://app.slack.com/client/T076LDT7109/C0764SE3VB7"
                style={{
                  display: "inline-block",
                  backgroundColor: "#16a34a",
                  borderRadius: "50%",
                  padding: "8px",
                  margin: "0 5px",
                }}>
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
      </Html>
    </Tailwind>
  );
};

export default PtNewsLetterMail;
