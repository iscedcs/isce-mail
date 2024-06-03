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

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";

const PtPromotionMail = () => {
  return (
    <Tailwind>
      <Html>
        <Head>
          <Preview>PalmTechnIQ Promotional Mail</Preview>
          <Body>
            <Container>
              <Section className="bg-[#021A1A] md:py-[100px] py-5 ">
                <Img
                  className="mx-auto py-3"
                  src={`https://www.palmtechniq.com/assets/palmtechniqlogo.png`}
                  width="200"
                  height="150"
                />
                <Img
                  width="200"
                  height="200"
                  src={`${baseUrl}/static/thanks.png`}
                />
              </Section>
              <Section className="text-[#333]">
                <Text className=" xl:px-0 lg:px-0 px-[20px]">
                  Hello, Ayobami
                </Text>
                <Text className=" xl:px-0 lg:px-0 px-[20px]">Message body</Text>
              </Section>
              <Section className="flex justify-center">
                <Button
                  className=" cursor-pointer rounded-full text-[12px] bg-[#00DB80] "
                  style={{ padding: "10px 20px" }}
                >
                  Continue
                </Button>
              </Section>
              <Link
                href=""
                style={{ color: "#E05125" }}
                className=" text-[12px] flex justify-center pt-2 "
              >
                Not working? click here
              </Link>
              <Hr className="mt-[30px]" />
              <Section className="text-center text-[#333333] flex justify-center ">
                <Text className=" xl:px-0 lg:px-0 px-[20px]">
                  Copyright © 2024 PalmTechnIQ, All Rights Reserved.
                </Text>
                <Text className=" xl:px-0 lg:px-0 px-[20px]">
                  You are recieving this mail because you opted in via our
                  website.
                </Text>
                <Text className=" xl:px-0 lg:px-0 px-[20px]">
                  Mailing Address: Somewhere in Lagos, In a Town, Nigeria.
                </Text>
              </Section>
            </Container>
          </Body>
        </Head>
      </Html>
    </Tailwind>
  );
};

export default PtPromotionMail;
