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

interface EmailVerificationProps {
  fullName: string;
  link: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `${process.env.VERCEL_URL}`
  : "/static";

const EmailVerification = ({
  fullName = "Nweke Ifeagwu",
  link,
}: EmailVerificationProps) => {
    const date = new Date().getFullYear();
  return (
    <Tailwind>
      <Html>
        <Head>
          <Preview>PalmTechnIQ NewsLetter Subscription Mail</Preview>
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
              <Section>
                <Text className="font-bold text-center text-[20px] mt-[20px]">
                  Welcome to the PalmTechnIQ Newsletter
                </Text>
                <Text className="md:text-left text-center  ">
                  Hi, {fullName}
                </Text>
                <Text className="text-center md:text-left ">
                  Congratulations, you will now be receiving updates and news on
                  anything concerning PalmTechnIQ. Our newsletter is a good way
                  to find out about new course additions, changes in
                  curriculums, happening events and so on.
                </Text>
                <Text className="text-center md:text-left ">
                  We are happy you are on board!!!
                </Text>
              </Section>
              <Section className="md:text-left text-center">
                <span>
                  <Text>
                    Thanks, <br />
                    <b>PalmTechnIQ Team</b>
                  </Text>
                </span>
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
    <Section className="pb-[40px] text-center ">
                <Button
                  href="https://www.facebook.com/profile.php?id=61560523394595"
                  className="bg-green-600 m-[5px] py-[8px] px-[10px] rounded-full "
                >
                  <Img
                    width="23"
                    height="23"
                    alt="facebook"
                    src={`https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/facebook-app-round-white-icon.png`}
                  />
                </Button>
                <Button
                  href="https://www.instagram.com/palmtechniq?igsh=MXVxMjJjMmxnZ3hzag=="
                  className="bg-green-600 m-[5px] py-[8px] px-[10px] rounded-full "
                >
                  <Img
                    width="23"
                    height="23"
                    alt="instagram"
                    src={`https://static-00.iconduck.com/assets.00/instagram-icon-256x256-ubgz701g.png`}
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

export default EmailVerification;
