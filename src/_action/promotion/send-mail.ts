'use server';

import { IBasis, sendEmail } from "@/lib/mail-action/promotion/mail";
import { ReactNode } from "react";


export const sendMailAction = async (formData: {
  subject: string;
  basis: IBasis;
  message: string;
  headerText: string;
  link: string;
  image: string;
  emails: string;
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
          formData.headerText,
          formData.message,
          formData.link,
          formData.image
        );
        console.log({ a });
      })
    );
    console.log(`Emails sent to ${emailArray.length} emails`);
    return { success: `Emails sent to ${emailArray.length} emails` };
  } catch (error) {
    return { error: `Something went wrong` };
  }
};
