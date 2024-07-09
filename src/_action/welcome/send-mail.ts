"use server";

import { IBasis, sendEmail } from "@/lib/mail-action/welcome/mail";

export const sendMailAction = async (formData: {
  subject: string;
  basis: IBasis;
  message: string;
  emails: string;
  link: string;
}) => {
  try {
    const emailArray = formData.emails.split(",");
    console.log({ formData });
    await Promise.all(
      emailArray.map((a: string) => {
        sendEmail(
          a.trim(),
          formData.subject,
          formData.basis as IBasis,
          formData.message,
          formData.link
        );
        console.log({ a });
      })
    );
    console.log(
      `Email sent to ${
        emailArray.length == 1
          ? `${emailArray.length} email address`
          : `${emailArray.length} email addresses`
      }`
    );
    return {
      success: `Email sent to ${
        emailArray.length == 1
          ? `${emailArray.length} email address`
          : `${emailArray.length} email addresses`
      }`,
    };
  } catch (error) {
    return { error: `Something went wrong` };
  }
};
