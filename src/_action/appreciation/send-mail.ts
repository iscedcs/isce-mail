"use server";

import { IBasis, sendBulkEmail } from "@/lib/mail-action/appreciation/mail";
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
  emails?: string;
  recipients?:
    | { email: string; firstname: string; url?: string }[]
    | BatchRecipient[];
}) => {
  try {
    let batchRecipients: BatchRecipient[];

    if (formData.recipients?.length) {
      // Support legacy { firstname } shape from the existing form
      batchRecipients = (formData.recipients as any[]).map((r) => ({
        email: r.email.trim(),
        name: r.firstname ?? r.name ?? "",
      }));
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
      type: "appreciation",
      basis: formData.basis,
      subject: formData.subject,
      recipientCount: sent,
    });
    return { success: `Email sent to ${recipientLabel(sent)}.` };
  } catch (error) {
    console.error("Error sending appreciation emails:", error);
    return { error: "Failed to send emails. Please try again." };
  }
};
