"use server";

import { IBasis, sendEmail } from "@/lib/mail-action/appreciation/mail";
import sanitizeHtml from "sanitize-html";

export const sendMailAction = async (formData: {
  subject: string;
  basis: IBasis;
  message: string;
  recipients: { email: string; firstname: string; url?: string }[];
  link: string;
}) => {
  try {
    const { subject, basis, message, recipients, link } = formData;
    console.log({ formData });

    if (!recipients.length || !subject || !message || !link) {
      return { error: "Missing required fields or recipients" };
    }

    await Promise.all(
      recipients.map(({ email, firstname, url }) => {
        // Replace {{firstname}} with the recipient's first name
        let personalizedMessage = message.replace(/{{firstname}}/g, firstname);

        // Replace {{url}} with the recipient's URL or empty string
        personalizedMessage = personalizedMessage.replace(
          /{{url}}/g,
          sanitizeHtml(url || "", {
            allowedTags: ["a"],
            allowedAttributes: { a: ["href"] },
          })
        );

        // Call sendEmail with the personalized message
        return sendEmail(
          email.trim(),
          subject.trim(),
          basis,
          personalizedMessage,
          link.trim()
        );
      })
    );
    const successMessage =
      recipients.length === 1
        ? `Email sent to ${recipients.length} recipient`
        : `Emails sent to ${recipients.length} recipients`;

    console.log(successMessage);
    return { success: successMessage };
  } catch (error) {
    console.error("Error sending emails:", error);
    return { error: "Failed to send emails. Please try again." };
  }
};
