import PtHolidayMail from "../../../../emails/templates/palmtechniq/holiday";
import ISCEHolidayMail from "../../../../emails/templates/isce/holiday";
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
          ? PtHolidayMail({ message: personalizedMessage, image })
          : ISCEHolidayMail({ message: personalizedMessage, image }),
    };
  });

  return sendBatch(resend, payloads);
};
