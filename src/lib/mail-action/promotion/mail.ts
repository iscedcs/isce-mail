import { Resend } from "resend";
import ISCEPromotionMail from "../../../../emails/templates/isce/promotion";
import PtPromotionMail from "../../../../emails/templates/palmtechniq/promotion";
import { HeadManagerContext } from "next/dist/shared/lib/head-manager-context.shared-runtime";

export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY);
const domain = process.env.VERCEL_URL;
export type IBasis = "ISCE" | "PalmTechniq";

export const sendEmail = async (
  email: string,
  subject: string,
  basis: IBasis,
  message: string,
  headerText: string,
  link: string,
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
        ? ISCEPromotionMail({ message: message, link: link, image: image })
        : basis === "PalmTechniq"
        ? PtPromotionMail({
            headerText: headerText,
            message: message,
            link: link,
            image: image,
          })
        : ISCEPromotionMail({ message: message, link: link, image: image }),
  });
};

// export const sendEmail = async (
//   email: string,
//   token: string,
//   subject: string,
//   message: string,
//   template: ITemplate
// ) => {
//   resend.emails.send({
//     from: '"ISCE Team" <support@striferral.com>', // support@isce.tech
//     to: email,
//     subject,
//     react:
//       template === "announcement"
//         ? AnnouncementEmail({ message })
//         : template === "event"
//         ? EventEmail({ loginCode: "123456" })
//         : template === "newsletter"
//         ? NewsletterEmail({ loginCode: "123456" })
//         : PromotionalEmail({ loginCode: "123456" }),
//   });
// };
