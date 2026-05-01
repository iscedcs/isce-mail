import ISCENewsLetterMail from "../../../../emails/templates/isce/newsletter";
import PtNewsLetterMail from "../../../../emails/templates/palmtechniq/newsletter";
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
          ? PtNewsLetterMail({ message: personalizedMessage })
          : ISCENewsLetterMail({ message: personalizedMessage }),
    };
  });

  return sendBatch(resend, payloads);
};

export const sendBulkEmailTracked = async (
  recipients: BatchRecipient[],
  subject: string,
  basis: IBasis,
  message: string,
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
          ? PtNewsLetterMail({ message: personalizedMessage })
          : ISCENewsLetterMail({ message: personalizedMessage }),
    };
  });

  return sendBatchTracked(resend, payloads);
};
