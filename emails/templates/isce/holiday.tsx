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

interface ISCEHolidayMailProps {
  message: string;
  image: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `${process.env.VERCEL_URL}`
  : "/static";

const ISCEHolidayMail = ({
  message,
  image,
}: ISCEHolidayMailProps) => {
  return (
    <Tailwind>
      <Html>
        <Head>
          <Preview>PalmTechnIQ Holiday Mail</Preview>
          <Body className="w-full">
            <Container className="w-full">
              <Section className="bg-[#000]">
                <Img
                  className="mx-auto py-3 h-full object-cover"
                  src={`https://www.isce.tech/_next/image?url=%2Ffi-white.webp&w=128&q=75`}
                  width="100"
                  height="100"
                />
              </Section>
              <Section className="w-full px-[20px] ">
                <Img
                  width="200"
                  className="mx-auto rounded-md object-cover w-full pt-6"
                  height="500"
                  src={`${image}`}
                />
              </Section>
              <Section>
                <Text className="xl:px-0 lg:px-0 text-left px-[20px]">
                  {message}
                </Text>
              </Section>
              <Hr className="mt-[30px]" />
              <Section className="text-left pt-[20px] px-[40px] bg-black text-[#ffffff]">
                <Text>
                  <p>
                    You are recieving this mail because you opted in via our
                    website.
                  </p>
                  <p>Copyright © 2024: ISCE, All Rights Reserved.</p>
                </Text>
              </Section>
              <Section className="pb-[40px] px-[25px] bg-black text-left ">
                <Button
                  href="/"
                  className="bg-white m-[5px] py-[8px] px-[10px] rounded-full "
                >
                  <Img
                    width="18"
                    height="18"
                    alt="facebook"
                    src={`https://cdn-icons-png.flaticon.com/128/3128/3128208.png`}
                  />
                </Button>
                <Button
                  href="/"
                  className="bg-white m-[5px] py-[8px] px-[10px] rounded-full "
                >
                  <Img
                    width="18"
                    height="18"
                    alt="linkedin"
                    src={`https://cdn-icons-png.flaticon.com/128/4401/4401412.png`}
                  />
                </Button>
                <Button
                  href="/"
                  className="bg-white m-[5px] py-[8px] px-[10px] rounded-full "
                >
                  <Img
                    width="18"
                    height="18"
                    alt="instagram"
                    src={`https://cdn-icons-png.flaticon.com/128/1400/1400829.png`}
                  />
                </Button>
                <Button
                  href="/"
                  className="bg-white m-[5px] py-[8px] px-[10px] rounded-full "
                >
                  <Img
                    width="18"
                    height="18"
                    alt="x"
                    src={`https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/x-social-media-black-icon.png`}
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

export default ISCEHolidayMail;
