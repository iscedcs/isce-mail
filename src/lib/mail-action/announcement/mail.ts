import { Resend } from "resend";
import PtAnnouncementMail from "../../../../emails/templates/palmtechniq/announcement";
import ISCEAnnouncementMail from "../../../../emails/templates/isce/announcement";

export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY);
const domain = process.env.VERCEL_URL;
export type IBasis = "ISCE" | "PalmTechniq";

export const sendEmail = async (
  email: string,
  subject: string,
  basis: IBasis,
  headerText: string,
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
        ? ISCEAnnouncementMail({
            headerText: headerText,
            message: message,
            link: link,
          })
        : basis === "PalmTechniq"
        ? PtAnnouncementMail({
            headerText: headerText,
            message: message,
            link: link,
          })
        : ISCEAnnouncementMail({
            headerText: headerText,
            message: message,
            link: link,
          }),
  });
};
