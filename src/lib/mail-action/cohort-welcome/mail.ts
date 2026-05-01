import PtCohortWelcomeMail from "../../../../emails/templates/palmtechniq/cohort-welcome";
import ISCECohortWelcomeMail from "../../../../emails/templates/isce/cohort-welcome";
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
  cohortName: string,
  startDate: string,
  mentorName: string,
  communityLink: string,
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
          ? PtCohortWelcomeMail({
              message: personalizedMessage,
              cohortName,
              startDate,
              mentorName,
              communityLink,
              link,
              bannerImage,
            })
          : ISCECohortWelcomeMail({
              message: personalizedMessage,
              cohortName,
              startDate,
              mentorName,
              communityLink,
              link,
              bannerImage,
            }),
    };
  });

  return sendBatch(resend, payloads);
};

export const sendBulkEmailTracked = async (
  recipients: BatchRecipient[],
  subject: string,
  basis: IBasis,
  message: string,
  cohortName: string,
  startDate: string,
  mentorName: string,
  communityLink: string,
  link: string,
  bannerImage?: string,
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
          ? PtCohortWelcomeMail({
              message: personalizedMessage,
              cohortName,
              startDate,
              mentorName,
              communityLink,
              link,
              bannerImage,
            })
          : ISCECohortWelcomeMail({
              message: personalizedMessage,
              cohortName,
              startDate,
              mentorName,
              communityLink,
              link,
              bannerImage,
            }),
    };
  });

  return sendBatchTracked(resend, payloads);
};
