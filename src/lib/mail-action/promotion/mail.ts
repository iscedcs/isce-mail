import { Resend } from "resend";
import ISCEPromotionMail from "../../../../emails/templates/isce/promotion";
import PtPromotionMail from "../../../../emails/templates/palmtechniq/promotion";
import { ReactNode } from "react";

export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY);
const domain = process.env.VERCEL_URL;
export type IBasis = "ISCE" | "PalmTechniq";

export const sendEmail = async (
  email: string,
  subject: string,
  basis: IBasis,
  message: string,
  link: string,
  image: string
) => {
  resend.emails.send({
    from:
      basis === "ISCE"
        ? "ISCE Team <support@palmtechniq.com>"
        : "PalmTechnIQ Team <support@palmtechniq.com>", // support@isce.tech
    to: email,
    subject,
    react:
      basis === "ISCE"
        ? ISCEPromotionMail({
            message: message,
            link: link,
            image: image,
          })
        : PtPromotionMail({
            message: message,
            link: link,
            image: image,
          }),
  });
};

