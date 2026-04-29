import { NextRequest, NextResponse } from "next/server";
import { createJob } from "@/lib/jobs";
import { parseEmailString } from "@/lib/mail-action/shared";

export const dynamic = "force-dynamic";

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

  const job = createJob({
    type: "course-promo",
    basis: body.basis ?? "ISCE",
    subject: body.subject,
    total: recipients.length,
  });

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
