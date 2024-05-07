'use server';

import { ITemplate, sendEmail } from "@/lib/mail";

export const sendMailAction = async (formData: {
	subject: string;
	message: string;
	template: string;
	emails: string;
}) => {
	try {
		const emailArray = formData.emails.split(',');
		console.log({ formData });
		await Promise.all(
			emailArray.map((a: string) => {
				sendEmail(
          a.trim(),
          "123456",
          formData.subject,
          formData.message,
          formData.template as ITemplate
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
