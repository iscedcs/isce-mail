import { NextRequest, NextResponse } from "next/server";
import { getJob, updateJob } from "@/lib/jobs";
import { sendBulkEmailTracked } from "@/lib/mail-action/course-promo/mail";
import { BatchRecipient, parseEmailString } from "@/lib/mail-action/shared";
import { logSend } from "@/lib/send-history";
import type { IBasis } from "@/lib/mail-action/course-promo/mail";

export const dynamic = "force-dynamic";
// Allow up to 60s — enough for large batches even on Pro
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const job = getJob(params.id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "pending") {
    return NextResponse.json({ error: "Job already started" }, { status: 409 });
  }

  const body = await req.json();
  const recipients: BatchRecipient[] = body.recipients?.length
    ? body.recipients
    : parseEmailString(body.emails ?? "");

  updateJob(params.id, { status: "running" });

  try {
    const result = await sendBulkEmailTracked(
      recipients,
      body.subject,
      body.basis as IBasis,
      body.message,
      body.courseTitle,
      body.originalPrice,
      body.discountPrice,
      body.deadline,
      body.link,
      body.bannerImage,
    );

    updateJob(params.id, {
      status: "done",
      sent: result.sent,
      failed: result.failed,
      completedAt: new Date().toISOString(),
    });

    logSend({
      type: "course-promo",
      basis: body.basis,
      subject: body.subject,
      recipientCount: result.sent,
    });
  } catch (err) {
    updateJob(params.id, {
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
      completedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
