import { Resend } from "resend";
import PtWelcomeMail from "../../../../emails/templates/palmtechniq/welcome";
import ISCEWelcomeMail from "../../../../emails/templates/isce/welcome";

export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY);
const domain = process.env.VERCEL_URL;
export type IBasis = "ISCE" | "PalmTechniq";

export const sendEmail = async (
  email: string,
  subject: string,
  basis: IBasis,
  message: string,
  link: string
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
        ? ISCEWelcomeMail({
            message: message,
            link: link,
          })
        : basis === "PalmTechniq"
        ? PtWelcomeMail({
            message: message,
            link: link,
          })
        : ISCEWelcomeMail({
            message: message,
            link: link,
          }),
  });
};
