import { Resend } from "resend";
import PtAppreciationMail from "../../../../emails/templates/palmtechniq/appreciation";
import ISCEAppreciationMail from "../../../../emails/templates/isce/appreciation";

export const revalidate = 0;

const palmtechniq_resend = new Resend(process.env.PALMTECHNIQ_RESEND_API_KEY);
const isce_resend = new Resend(process.env.ISCE_RESEND_API_KEY);
const domain = process.env.VERCEL_URL;
export type IBasis = "ISCE" | "PalmTechniq";

export const sendEmail = async (
  email: string,
  subject: string,
  basis: IBasis,
  message: string,
  link: string
) => {
  const resendInstance =
    basis === "ISCE"
      ? isce_resend
      : basis === "PalmTechniq"
      ? palmtechniq_resend
      : isce_resend;

  resendInstance.batch.send([
    {
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
          ? ISCEAppreciationMail({ message: message })
          : PtAppreciationMail({
              message: message,
              link: link,
            }),
    },
  ]);
};
