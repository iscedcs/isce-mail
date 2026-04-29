import PtCoursePromoMail from "../../../../emails/templates/palmtechniq/course-promo";
import ISCECoursePromoMail from "../../../../emails/templates/isce/course-promo";
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
  courseTitle: string,
  originalPrice: string,
  discountPrice: string,
  deadline: string,
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
          ? PtCoursePromoMail({
              message: personalizedMessage,
              courseTitle,
              originalPrice,
              discountPrice,
              deadline,
              link,
              bannerImage,
            })
          : ISCECoursePromoMail({
              message: personalizedMessage,
              courseTitle,
              originalPrice,
              discountPrice,
              deadline,
              link,
              bannerImage,
            }),
    };
  });

  return sendBatch(resend, payloads);
};

/** Tracked variant — used by the fire-and-forget API route. */
export const sendBulkEmailTracked = async (
  recipients: BatchRecipient[],
  subject: string,
  basis: IBasis,
  message: string,
  courseTitle: string,
  originalPrice: string,
  discountPrice: string,
  deadline: string,
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
          ? PtCoursePromoMail({
              message: personalizedMessage,
              courseTitle,
              originalPrice,
              discountPrice,
              deadline,
              link,
              bannerImage,
            })
          : ISCECoursePromoMail({
              message: personalizedMessage,
              courseTitle,
              originalPrice,
              discountPrice,
              deadline,
              link,
              bannerImage,
            }),
    };
  });

  return sendBatchTracked(resend, payloads);
};
