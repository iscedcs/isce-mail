import { NextRequest, NextResponse } from "next/server";
import { parseEmailString, BatchRecipient } from "@/lib/mail-action/shared";
import { logSend } from "@/lib/send-history";
import { createCampaignWithBatches } from "@/lib/campaign-db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Stamped before any work so campaign creation counts against the same 60s
  // ceiling as the dispatch does.
  const deadlineAt = Date.now() + 45_000;

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
    const result = await createCampaignWithBatches({
      type: "event",
      basis: body.basis,
      subject: body.subject,
      message: body.message ?? "",
      link: body.link,
      recipients,
      deadlineAt,
    });

    logSend({
      type: "event",
      basis: body.basis,
      subject: body.subject,
      recipientCount: result.batch1SentCount,
    });

    return NextResponse.json({
      sent: result.batch1SentCount,
      failed: 0,
      // >0 means the request hit its time budget and the scheduler tick will
      // finish the rest — not that anything was lost.
      queued: result.batch1Remaining,
      campaignId: result.campaignId,
      batches: result.batches,
      totalTarget: result.totalTarget,
      excludedCount: result.excludedCount,
      dispatchError: result.dispatchError,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed." },
      { status: 500 },
    );
  }
}
