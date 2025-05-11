import { Resend } from "resend";
import PtAnnouncementMail from "../../../../emails/templates/palmtechniq/announcement";
import ISCEAnnouncementMail from "../../../../emails/templates/isce/announcement";

export const revalidate = 0;

const palmtechniq_resend = new Resend(process.env.PALMTECHNIQ_RESEND_API_KEY);
const domain = process.env.VERCEL_URL;
export type IBasis = "ISCE" | "PalmTechniq";

export const sendEmail = async (
  email: string,
  subject: string,
  basis: IBasis,
  message: string,
  link: string
) => {
  palmtechniq_resend.batch.send([
    {
      from:
        basis === "ISCE"
          ? "ISCE Team <hello@isce.tech>"
          : "PalmTechnIQ Team <support@palmtechniq.com>",
      to: email,
      subject,
      react:
        basis === "ISCE"
          ? ISCEAnnouncementMail({
              message: message,
              link: link,
            })
          : PtAnnouncementMail({
              message: message,
              link: link,
            }),
    },
  ]);
};
