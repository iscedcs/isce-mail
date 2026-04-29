import ISCEPromotionMail from "../../../../emails/templates/isce/promotion";
import PtPromotionMail from "../../../../emails/templates/palmtechniq/promotion";
import {
  IBasis,
  BatchRecipient,
  EmailPayload,
  getResendInstance,
  getSenderAddress,
  interpolate,
  sendBatch,
  sendBatchTracked,
  BatchResult,
} from "../shared";

export type { IBasis };
export const revalidate = 0;

export const sendBulkEmail = async (
  recipients: BatchRecipient[],
  subject: string,
  basis: IBasis,
  message: string,
  link: string,
  image: string,
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
          ? PtPromotionMail({ message: personalizedMessage, link, image })
          : ISCEPromotionMail({ message: personalizedMessage, link, image }),
    };
  });

  return sendBatch(resend, payloads);
};

/** Tracked variant — used by the API route to avoid server action timeout. */
export const sendBulkEmailTracked = async (
  recipients: BatchRecipient[],
  subject: string,
  basis: IBasis,
  message: string,
  link: string,
  image: string,
): Promise<BatchResult> => {
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
          ? PtPromotionMail({ message: personalizedMessage, link, image })
          : ISCEPromotionMail({ message: personalizedMessage, link, image }),
    };
  });

  return sendBatchTracked(resend, payloads);
};
