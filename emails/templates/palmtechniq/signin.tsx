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

interface SignInProps {
  fullName: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `${process.env.VERCEL_URL}`
  : "/static";

const SignIn = ({ fullName = "Nweke Ifeagwu" }: SignInProps) => {
  const date = new Date().getFullYear();

  return (
    <Tailwind>
      <Html>
        <Head>
          <Preview>PalmTechnIQ User Registration Mail</Preview>
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
                  className="mx-auto rounded-md md:object-cover object-contain w-full"
                  height="200"
                  src={`https://isce-mail.vercel.app/static/template-images/thanks.png`}
                />
              </Section>
              <Section>
                <Text className="font-bold text-[20px] ">
                  Your journey has started!!
                </Text>
                <Text>Dear {fullName},</Text>
                <Text>
                  We are glad to have you onboard, thank you for joining us on
                  this learning adventure. We are absolutely thrilled to have
                  you with us!
                </Text>
                <Text>
                  You are here because you are eager for knowledge and ready to
                  explore new horizons and you are ready to take charge of your
                  future and carve your path to success.
                </Text>
              </Section>
              <Section className=" md:text-left text-center">
                <Button
                  href="https://wa.me/qr/GHKMMDKEJZNEF1" /*Admin whatsapp link*/
                  className=" cursor-pointer rounded-full text-white text-[13px] bg-green-600 "
                  style={{ padding: "10px 20px", margin: "0 auto" }}
                >
                  View Courses
                </Button>
              </Section>
              <Section className="text-left">
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
                  href="/"
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
                  href="/"
                  className="bg-green-600 m-[5px] py-[8px] px-[10px] rounded-full "
                >
                  <Img
                    width="23"
                    height="23"
                    alt="facebook"
                    src={`https://static-00.iconduck.com/assets.00/linkedin-icon-512x512-a7sf08js.png`}
                  />
                </Button>
                <Button
                  href="/"
                  className="bg-green-600 m-[5px] py-[8px] px-[10px] rounded-full "
                >
                  <Img
                    width="23"
                    height="23"
                    alt="facebook"
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

export default SignIn;
