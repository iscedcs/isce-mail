import PtAppreciationMail from "../../../../emails/templates/palmtechniq/appreciation";
import ISCEAppreciationMail from "../../../../emails/templates/isce/appreciation";
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
          ? PtAppreciationMail({ message: personalizedMessage, link })
          : ISCEAppreciationMail({ message: personalizedMessage }),
    };
  });

  return sendBatch(resend, payloads);
};
