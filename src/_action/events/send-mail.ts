"use server";

import { IBasis, sendBulkEmail } from "@/lib/mail-action/event/mail";
import { logSend } from "@/lib/send-history";
import {
  BatchRecipient,
  parseEmailString,
  interpolate,
  recipientLabel,
} from "@/lib/mail-action/shared";
import sanitizeHtml from "sanitize-html";

export const sendMailAction = async (formData: {
  subject: string;
  basis: IBasis;
  message: string;
  link: string;
  emails?: string;
  recipients?: { email: string; firstname: string; url?: string }[];
}) => {
  try {
    // Support legacy recipients array (with firstname) from the existing form
    let batchRecipients: BatchRecipient[];

    if (formData.recipients?.length) {
      batchRecipients = formData.recipients.map(({ email, firstname, url }) => {
        // url substitution still handled here for backward compat
        return { email: email.trim(), name: firstname };
      });
    } else {
      batchRecipients = parseEmailString(formData.emails!);
    }

    if (!batchRecipients.length) return { error: "No recipients provided." };
    if (!formData.subject) return { error: "Subject is required." };
    if (!formData.message) return { error: "Message is required." };

    const sent = await sendBulkEmail(
      batchRecipients,
      formData.subject,
      formData.basis,
      formData.message,
      formData.link,
    );

    logSend({
      type: "event",
      basis: formData.basis,
      subject: formData.subject,
      recipientCount: sent,
    });
    return { success: `Email sent to ${recipientLabel(sent)}.` };
  } catch (error) {
    console.error("Error sending event emails:", error);
    return { error: "Failed to send emails. Please try again." };
  }
};
