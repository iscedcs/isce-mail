import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Html,
  Img,
  Hr,
  Row,
  Section,
  Text,
  Tailwind,
  Preview,
} from "@react-email/components";
import React from "react";
import parse from "html-react-parser";

interface PtCoursePromoMailProps {
  message: string;
  courseTitle: string;
  originalPrice: string;
  discountPrice: string;
  deadline: string;
  link: string;
  bannerImage?: string;
}

const PtCoursePromoMail = ({
  message,
  courseTitle,
  originalPrice,
  discountPrice,
  deadline,
  link,
  bannerImage,
}: PtCoursePromoMailProps) => {
  const sanitizedHTML = parse(message);
  const year = new Date().getFullYear();

  function parsePrice(price: string): number {
    return parseFloat(price.replace(/[^0-9.]/g, "")) || 0;
  }
  const originalVal = parsePrice(originalPrice);
  const discountVal = parsePrice(discountPrice);
  const discountPercent =
    originalVal > 0 ? Math.round((1 - discountVal / originalVal) * 100) : 0;

  return (
    <Tailwind>
      <Html>
        <Head />
        <Preview>
          🎓 {courseTitle} — {discountPercent > 0 ? `${discountPercent}% OFF` : `Enroll now`}{deadline ? ` · Offer ends ${deadline}` : ""}
        </Preview>
        <Body style={{ backgroundColor: "#f0f2f0", margin: 0, padding: 0 }}>
          <Container
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              backgroundColor: "#ffffff",
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}>

            {/* ── Header bar ── */}
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

            {/* ── Hero banner image (full-width, no clipping) ── */}
            {bannerImage && (
              <Section style={{ lineHeight: 0, fontSize: 0 }}>
                <Img
                  src={bannerImage}
                  alt={courseTitle}
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

            {/* ── Course title strip ── */}
            <Section
              style={{
                backgroundColor: "#021A1A",
                padding: "20px 32px",
                textAlign: "center",
              }}>
              <Text
                style={{
                  color: "#4ade80",
                  fontSize: "22px",
                  fontWeight: "700",
                  margin: "0",
                  lineHeight: "1.3",
                  letterSpacing: "-0.3px",
                }}>
                {courseTitle}
              </Text>
            </Section>

            {/* ── Message body ── */}
            <Section
              style={{
                padding: "32px 36px 24px",
                color: "#1a1a1a",
                fontSize: "15px",
                lineHeight: "1.7",
              }}>
              {sanitizedHTML}
            </Section>

            {/* ── Offer card ── */}
            {discountPercent > 0 && (
              <Section
                style={{
                  margin: "0 36px 32px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                }}>
                {/* Top accent stripe */}
                <Section
                  style={{
                    backgroundColor: "#021A1A",
                    padding: "14px 24px",
                    textAlign: "center",
                  }}>
                  <Text
                    style={{
                      color: "#4ade80",
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      margin: "0",
                    }}>
                    ✦ Limited-Time Offer ✦
                  </Text>
                </Section>

                {/* Discount + price row */}
                <Section
                  style={{
                    backgroundColor: "#f9fafb",
                    padding: "28px 24px 20px",
                    textAlign: "center",
                  }}>
                  <Row>
                    <Column style={{ textAlign: "center" }}>
                      <Text
                        style={{
                          color: "#16a34a",
                          fontSize: "58px",
                          fontWeight: "800",
                          margin: "0",
                          lineHeight: "1",
                        }}>
                        {discountPercent}%
                      </Text>
                      <Text
                        style={{
                          color: "#021A1A",
                          fontSize: "14px",
                          fontWeight: "700",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          margin: "4px 0 0",
                        }}>
                        OFF
                      </Text>
                    </Column>
                    <Column
                      style={{
                        borderLeft: "1px solid #e5e7eb",
                        paddingLeft: "24px",
                        textAlign: "left",
                      }}>
                      <Text
                        style={{
                          color: "#9ca3af",
                          fontSize: "13px",
                          fontWeight: "500",
                          textDecoration: "line-through",
                          margin: "0",
                        }}>
                        {originalPrice}
                      </Text>
                      <Text
                        style={{
                          color: "#111827",
                          fontSize: "26px",
                          fontWeight: "800",
                          margin: "2px 0",
                        }}>
                        {discountPrice}
                      </Text>
                      {deadline && (
                        <Text
                          style={{
                            backgroundColor: "#fef2f2",
                            color: "#b91c1c",
                            fontSize: "12px",
                            fontWeight: "600",
                            padding: "4px 10px",
                            borderRadius: "20px",
                            display: "inline-block",
                            margin: "4px 0 0",
                          }}>
                          ⏰ Ends {deadline}
                        </Text>
                      )}
                    </Column>
                  </Row>
                </Section>

                {/* CTA button */}
                <Section
                  style={{
                    backgroundColor: "#021A1A",
                    padding: "20px 24px",
                    textAlign: "center",
                  }}>
                  <Button
                    href={link}
                    style={{
                      backgroundColor: "#16a34a",
                      color: "#ffffff",
                      fontSize: "15px",
                      fontWeight: "700",
                      textDecoration: "none",
                      padding: "14px 40px",
                      borderRadius: "8px",
                      display: "inline-block",
                    }}>
                    Claim This Offer →
                  </Button>
                </Section>
              </Section>
            )}

            {/* Fallback CTA when no discount */}
            {discountPercent === 0 && (
              <Section style={{ textAlign: "center", padding: "8px 36px 36px" }}>
                <Button
                  href={link}
                  style={{
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: "700",
                    textDecoration: "none",
                    padding: "14px 40px",
                    borderRadius: "8px",
                    display: "inline-block",
                  }}>
                  Enroll Now →
                </Button>
              </Section>
            )}

            <Hr style={{ borderColor: "#e5e7eb", margin: "0" }} />

            {/* ── Footer ── */}
            <Section
              style={{
                padding: "20px 32px 12px",
                textAlign: "center",
                color: "#9ca3af",
              }}>
              <Text style={{ fontSize: "12px", margin: "0" }}>
                Copyright © {year} PalmTechnIQ, All Rights Reserved.
              </Text>
              <Text style={{ fontSize: "11px", margin: "6px 0 0", color: "#d1d5db" }}>
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

            {/* Social icons */}
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

export default PtCoursePromoMail;
