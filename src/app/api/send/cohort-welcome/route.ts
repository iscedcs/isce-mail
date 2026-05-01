import { NextRequest, NextResponse } from "next/server";
import { sendBulkEmailTracked } from "@/lib/mail-action/cohort-welcome/mail";
import { parseEmailString } from "@/lib/mail-action/shared";
import { logSend } from "@/lib/send-history";
import type { IBasis } from "@/lib/mail-action/cohort-welcome/mail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const recipients = body.recipients?.length
    ? body.recipients
    : parseEmailString(body.emails ?? "");

  if (!recipients.length) {
    return NextResponse.json({ error: "No recipients provided." }, { status: 400 });
  }
  if (!body.subject) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }
  if (!body.cohortName) {
    return NextResponse.json({ error: "Cohort name is required." }, { status: 400 });
  }

  try {
    const result = await sendBulkEmailTracked(
      recipients,
      body.subject,
      body.basis as IBasis,
      body.message,
      body.cohortName,
      body.startDate,
      body.mentorName,
      body.communityLink,
      body.link,
      body.bannerImage,
    );

    logSend({
      type: "cohort-welcome",
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
