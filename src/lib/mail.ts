import { Resend } from 'resend';
import { TwoFactorEmailTemplate } from '@/components/templates/TwoFactorEmailTemplate';
import AnnouncementEmail from '@/components/templates/announcement';
import EventEmail from '@/components/templates/event';
import NewsletterEmail from '@/components/templates/newsletter';
import PromotionalEmail from '@/components/templates/promotion';

export const revalidate = 0;

const resend = new Resend(process.env.RESEND_API_KEY);
const domain = process.env.NEXT_PUBLIC_APP_URL;

export type ITemplate = 'promotion' | 'event' | 'announcement' | 'newsletter';
export const sendEmail = async (
  email: string,
  token: string,
  subject: string,
  message: string,
  template: ITemplate
) => {
  resend.emails.send({
    from: '"ISCE Team" <support@striferral.com>', // support@isce.tech
    to: email,
    subject,
    react:
      template === "announcement"
        ? AnnouncementEmail({ message })
        : template === "event"
        ? EventEmail({ loginCode: "123456" })
        : template === "newsletter"
        ? NewsletterEmail({ loginCode: "123456" })
        : PromotionalEmail({ loginCode: "123456" }),
  });
};
