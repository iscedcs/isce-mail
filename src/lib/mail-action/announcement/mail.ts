import PtAnnouncementMail from "../../../../emails/templates/palmtechniq/announcement";
import ISCEAnnouncementMail from "../../../../emails/templates/isce/announcement";
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
          ? PtAnnouncementMail({ message: personalizedMessage, link })
          : ISCEAnnouncementMail({ message: personalizedMessage, link }),
    };
  });

  return sendBatch(resend, payloads);
};
