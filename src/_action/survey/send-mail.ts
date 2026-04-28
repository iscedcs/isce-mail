"use server";

import { IBasis, sendBulkEmail } from "@/lib/mail-action/survey/mail";
import { logSend } from "@/lib/send-history";
import {
  BatchRecipient,
  parseEmailString,
  recipientLabel,
} from "@/lib/mail-action/shared";

export const sendMailAction = async (formData: {
  subject: string;
  basis: IBasis;
  message: string;
  link: string;
  emails: string;
  recipients?: BatchRecipient[];
}) => {
  try {
    const recipients: BatchRecipient[] = formData.recipients?.length
      ? formData.recipients
      : parseEmailString(formData.emails);

    if (!recipients.length) return { error: "No recipients provided." };
    if (!formData.subject) return { error: "Subject is required." };
    if (!formData.message) return { error: "Message is required." };

    const sent = await sendBulkEmail(
      recipients,
      formData.subject,
      formData.basis,
      formData.message,
      formData.link,
    );

    logSend({
      type: "survey",
      basis: formData.basis,
      subject: formData.subject,
      recipientCount: sent,
    });
    return { success: `Email sent to ${recipientLabel(sent)}.` };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
};
