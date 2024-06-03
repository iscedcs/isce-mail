import { Resend } from 'resend';
import PromotionalEmail from "@/components/templates/isce/promotion";
import PtPromotionMail from "@/components/templates/palmtechniq/pt-promotion";

export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY);
const domain = process.env.NEXT_PUBLIC_APP_URL;
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
        ? "ISCE Team <support@striferral.com>"
        : basis === "PalmTechniq"
        ? "PalmTechnIQ Team <support@striferral.com>"
        : "ISCE Team <support@striferral.com>", // support@isce.tech
    to: email,
    subject,
    react:
      basis === "ISCE"
        ? PromotionalEmail({ message: message, link: link, image: image })
        : basis === "PalmTechniq"
        ? PtPromotionMail()
        : PromotionalEmail({ message: message, link: link, image: image }),
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
