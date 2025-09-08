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
  Column,
  Row,
  Text,
  Tailwind,
  Preview,
} from "@react-email/components";
import React from "react";
import parse from "html-react-parser";

interface PtWelcomeMailProps {
  message: string;
  link: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `${process.env.VERCEL_URL}`
  : "/static";

const PtWelcomeMail = ({ message, link }: PtWelcomeMailProps) => {
  const santizedHTML = parse(message);
  const date = new Date().getFullYear();

  return (
    <Tailwind>
      <Html>
        <Head>
          <Preview>PalmTechnIQ Welcome Mail</Preview>
          <Body className="w-full">
            <Container className="w-full">
              <Section className="bg-[#021A1A]">
                <Img
                  className="mx-auto py-3 h-full object-cover"
                  src={`https://www.palmtechniq.com/assets/palmtechniqlogo.png`}
                  width="200"
                  height="200"
                />
              </Section>
              <Section className="w-full ">
                <Img
                  width="200"
                  className="mx-auto rounded-md object-contain w-full pt-6"
                  height="200"
                  src={`https://isce-mail.vercel.app/static/template-images/palmtechniq-welcome.png`}
                />
              </Section>
              <Section>{santizedHTML}</Section>

              <Section className="text-center">
                <Button
                  href={link}
                  className=" cursor-pointer rounded-full text-white text-[13px] bg-green-600 "
                  style={{ padding: "10px 20px", margin: "0 auto" }}>
                  Check out the courses
                </Button>
              </Section>
              <Hr className="mt-[30px]" />
              <Section className="text-center text-[#333333]">
                <Text>
                  <p>Copyright © {date} PalmTechnIQ, All Rights Reserved.</p>

                  <p>
                    Mailing Address: 1st Floor, (Festac Tower) Chicken Republic
                    Building, 22Rd ,Festac Town, Lagos, Nigeria.
                  </p>
                </Text>
              </Section>
              <Section className="pb-[40px] text-center">
                <Button
                  href="https://www.facebook.com/profile.php?id=61561459226438&mibextid=ZbWKwL"
                  className="m-[5px] rounded-full bg-green-600 px-[10px] py-[8px]">
                  <Img
                    width="23"
                    height="23"
                    alt="PalmTechnIQ"
                    src={`https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/facebook-app-round-white-icon.png`}
                  />
                </Button>
                <Button
                  href="https://www.linkedin.com/company/palmtechniq/"
                  className="m-[5px] rounded-full bg-green-600 px-[10px] py-[8px]">
                  <Img
                    width="23"
                    height="23"
                    alt="linkedin"
                    src={`https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/linkedin-app-icon.png`}
                  />
                </Button>
                <Button
                  href="https://www.instagram.com/palmtechniq/"
                  className="m-[5px] rounded-full bg-green-600 px-[10px] py-[8px]">
                  <Img
                    width="23"
                    height="23"
                    alt="instagram"
                    src={`https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/ig-instagram-icon.png`}
                  />
                </Button>
                <Button
                  href="https://app.slack.com/client/T076LDT7109/C0764SE3VB7"
                  className="m-[5px] rounded-full bg-green-600 px-[10px] py-[8px]">
                  <Img
                    width="23"
                    height="23"
                    alt="slack"
                    src={`https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/slack-icon.png`}
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

export default PtWelcomeMail;
