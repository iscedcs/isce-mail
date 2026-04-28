import PtCurriculumMail from "../../../../emails/templates/palmtechniq/curriculum";
import ISCECurriculumMail from "../../../../emails/templates/isce/curriculum";
import {
  IBasis,
  BatchRecipient,
  EmailPayload,
  getResendInstance,
  getSenderAddress,
  interpolate,
  sendBatch,
} from "../shared";

export type { IBasis };
export const revalidate = 0;

export const sendBulkEmail = async (
  recipients: BatchRecipient[],
  subject: string,
  basis: IBasis,
  message: string,
  courseName: string,
  link: string,
  bannerImage?: string,
): Promise<number> => {
  const resend = getResendInstance(basis);
  const from = getSenderAddress(basis);

  const payloads: EmailPayload[] = recipients.map((recipient) => {
    const personalizedMessage = interpolate(message, recipient);
    return {
      from,
      to: recipient.email,
      subject,
      react:
        basis === "PalmTechniq"
          ? PtCurriculumMail({
              message: personalizedMessage,
              courseName,
              link,
              bannerImage,
            })
          : ISCECurriculumMail({
              message: personalizedMessage,
              courseName,
              link,
              bannerImage,
            }),
    };
  });

  return sendBatch(resend, payloads);
};
