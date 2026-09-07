import { NextRequest, NextResponse } from "next/server";
import { sendBulkEmailTracked } from "@/lib/mail-action/welcome/mail";
import { parseEmailString, BatchRecipient } from "@/lib/mail-action/shared";
import { logSend } from "@/lib/send-history";
import { createCampaign, attachResendIds, updateCampaign } from "@/lib/campaigns";
import type { IBasis } from "@/lib/mail-action/welcome/mail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const rawRecipients = body.recipients?.length
    ? body.recipients
    : parseEmailString(body.emails ?? "");

  const recipients: BatchRecipient[] = (rawRecipients as any[])
    .map((rec) => ({
      email: rec.email?.trim(),
      name: rec.name ?? rec.firstname ?? "",
      url: rec.url ?? "",
    }))
    .filter((rec) => Boolean(rec.email));

  if (!recipients.length) {
    return NextResponse.json(
      { error: "No recipients provided." },
      { status: 400 },
    );
  }

  if (!body.subject) return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  if (!body.message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

  try {
    let campaignId = body.campaignId;
    if (!campaignId) {
      const campaign = createCampaign({
        type: "welcome",
        basis: body.basis,
        subject: body.subject,
        message: body.message ?? "",
        link: body.link,
        status: "sending",
        recipients: recipients.map((rec) => ({
          email: rec.email,
          firstname: rec.name ?? "",
          url: rec.url ?? "",
          events: {},
        })),
      });
      campaignId = campaign.id;
    }

    const result = await sendBulkEmailTracked(recipients, body.subject, body.basis as IBasis, body.message, body.link ?? "");

    if (campaignId) {
      attachResendIds(campaignId, result.ids ?? []);
      updateCampaign(campaignId, {
        status: "sent",
        sentAt: new Date().toISOString(),
        stats: {
          total: recipients.length,
          sent: result.sent,
          failed: result.failed,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          complained: 0,
        },
      });
    }

    logSend({
      type: "welcome",
      basis: body.basis,
      subject: body.subject,
      recipientCount: result.sent,
    });

    return NextResponse.json({ ...result, campaignId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed." },
      { status: 500 },
    );
  }
}
