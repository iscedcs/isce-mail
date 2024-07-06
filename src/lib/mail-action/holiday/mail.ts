import { Resend } from "resend";

import PtHolidayMail from "../../../../emails/templates/palmtechniq/holiday";
import ISCEHolidayMail from "../../../../emails/templates/isce/holiday";

export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY);
const domain = process.env.VERCEL_URL;
export type IBasis = "ISCE" | "PalmTechniq";

export const sendEmail = async (
  email: string,
  subject: string,
  basis: IBasis,
  message: string,
  image: string
) => {
  resend.emails.send({
    from:
      basis === "ISCE"
        ? "ISCE Team <support@palmtechniq.com>"
        : basis === "PalmTechniq"
        ? "PalmTechnIQ Team <support@palmtechniq.com>"
        : "ISCE Team <support@striferral.com>", // support@isce.tech
    to: email,
    subject,
    react:
      basis === "ISCE"
        ? ISCEHolidayMail({
            message: message,
            image: image,
          })
        : basis === "PalmTechniq"
        ? PtHolidayMail({
            message: message,
            image: image,
          })
        : ISCEHolidayMail({
            message: message,
            image: image,
          }),
  });
};
