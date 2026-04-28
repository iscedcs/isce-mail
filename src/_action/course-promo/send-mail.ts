"use server";

import { IBasis, sendBulkEmail } from "@/lib/mail-action/course-promo/mail";
import {
  BatchRecipient,
  parseEmailString,
  recipientLabel,
} from "@/lib/mail-action/shared";
import { logSend } from "@/lib/send-history";

export const sendMailAction = async (formData: {
  subject: string;
  basis: IBasis;
  message: string;
  courseTitle: string;
  originalPrice: string;
  discountPrice: string;
  deadline: string;
  emails: string;
  link: string;
  bannerImage?: string;
  recipients?: BatchRecipient[];
}) => {
  try {
    const recipients: BatchRecipient[] = formData.recipients?.length
      ? formData.recipients
      : parseEmailString(formData.emails);

    if (!recipients.length) return { error: "No recipients provided." };
    if (!formData.subject) return { error: "Subject is required." };
    if (!formData.courseTitle) return { error: "Course title is required." };
    if (!formData.discountPrice)
      return { error: "Discounted price is required." };

    const sent = await sendBulkEmail(
      recipients,
      formData.subject,
      formData.basis,
      formData.message,
      formData.courseTitle,
      formData.originalPrice,
      formData.discountPrice,
      formData.deadline,
      formData.link,
      formData.bannerImage,
    );

    logSend({
      type: "course-promo",
      basis: formData.basis,
      subject: formData.subject,
      recipientCount: sent,
    });
    return { success: `Email sent to ${recipientLabel(sent)}.` };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
};
