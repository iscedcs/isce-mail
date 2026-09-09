import { NextRequest, NextResponse } from "next/server";
import { parseEmailString, BatchRecipient } from "@/lib/mail-action/shared";
import { logSend } from "@/lib/send-history";
import { createCampaignWithBatches } from "@/lib/campaign-db";

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
  if (!body.courseName) return NextResponse.json({ error: "Course name is required." }, { status: 400 });

  try {
    const result = await createCampaignWithBatches({
      type: "curriculum",
      basis: body.basis,
      subject: body.subject,
      message: body.message ?? "",
      link: body.link,
      recipients,
      templateProps: {
        courseName: body.courseName,
        pdfUrl: body.pdfUrl,
        bannerImage: body.bannerImage,
      },
    });

    logSend({
      type: "curriculum",
      basis: body.basis,
      subject: body.subject,
      recipientCount: result.batch1SentCount,
    });

    return NextResponse.json({
      sent: result.batch1SentCount,
      failed: 0,
      campaignId: result.campaignId,
      batches: result.batches,
      totalTarget: result.totalTarget,
      excludedCount: result.excludedCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed." },
      { status: 500 },
    );
  }
}
