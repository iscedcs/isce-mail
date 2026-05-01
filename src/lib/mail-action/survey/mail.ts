import PtSurveyMail from "../../../../emails/templates/palmtechniq/survey";
import ISCESurveyMail from "../../../../emails/templates/isce/survey";
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
          ? PtSurveyMail({ message: personalizedMessage, link })
          : ISCESurveyMail({ message: personalizedMessage, link }),
    };
  });

  return sendBatch(resend, payloads);
};

export const sendBulkEmailTracked = async (
  recipients: BatchRecipient[],
  subject: string,
  basis: IBasis,
  message: string,
  link: string,
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
          ? PtSurveyMail({ message: personalizedMessage, link })
          : ISCESurveyMail({ message: personalizedMessage, link }),
    };
  });

  return sendBatchTracked(resend, payloads);
};
