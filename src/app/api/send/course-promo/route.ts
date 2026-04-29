import { NextRequest, NextResponse } from "next/server";
import { sendBulkEmailTracked } from "@/lib/mail-action/course-promo/mail";
import { parseEmailString } from "@/lib/mail-action/shared";
import { logSend } from "@/lib/send-history";
import type { IBasis } from "@/lib/mail-action/course-promo/mail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const recipients = body.recipients?.length
    ? body.recipients
    : parseEmailString(body.emails ?? "");

  if (!recipients.length) {
    return NextResponse.json(
      { error: "No recipients provided." },
      { status: 400 },
    );
  }
  if (!body.subject) {
    return NextResponse.json(
      { error: "Subject is required." },
      { status: 400 },
    );
  }

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

    logSend({
      type: "course-promo",
      basis: body.basis,
      subject: body.subject,
      recipientCount: result.sent,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed." },
      { status: 500 },
    );
  }
}
