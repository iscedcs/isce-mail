"use server";

import { IBasis, sendBulkEmail } from "@/lib/mail-action/cohort-welcome/mail";
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
  cohortName: string;
  startDate: string;
  mentorName: string;
  communityLink: string;
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
    if (!formData.cohortName) return { error: "Cohort name is required." };

    const sent = await sendBulkEmail(
      recipients,
      formData.subject,
      formData.basis,
      formData.message,
      formData.cohortName,
      formData.startDate,
      formData.mentorName,
      formData.communityLink,
      formData.link,
      formData.bannerImage,
    );

    logSend({
      type: "cohort-welcome",
      basis: formData.basis,
      subject: formData.subject,
      recipientCount: sent,
    });
    return { success: `Email sent to ${recipientLabel(sent)}.` };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
};
