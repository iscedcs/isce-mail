import { Resend } from "resend";
import PtAppreciationMail from "../../../../emails/templates/palmtechniq/appreciation";
import ISCEAppreciationMail from "../../../../emails/templates/isce/appreciation";

export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY);
const domain = process.env.VERCEL_URL;
export type IBasis = "ISCE" | "PalmTechniq";

export const sendEmail = async (
  email: string,
  subject: string,
  basis: IBasis,
  headerText: string,
  message: string
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
        ? ISCEAppreciationMail({ message: message, headerText: headerText })
        : basis === "PalmTechniq"
        ? PtAppreciationMail({
            headerText: headerText,
            message: message,
          })
        : ISCEAppreciationMail({ message: message, headerText: headerText }),
  });
};
