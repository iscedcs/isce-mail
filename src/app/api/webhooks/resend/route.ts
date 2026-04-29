import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pushEmailEvent, EmailEventType } from "@/lib/email-events";

export const dynamic = "force-dynamic";

/**
 * Verify Resend / Standard Webhooks signature.
 * Header format: svix-id, svix-timestamp, svix-signature
 * Signed content: "{svix-id}.{svix-timestamp}.{raw body}"
 * Secret format: "whsec_<base64>"
 */
async function verifyResendSignature(
  req: NextRequest,
  rawBody: string,
): Promise<boolean> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return false;

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Reject events older than 5 minutes
  const ts = parseInt(svixTimestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const signingInput = `${svixId}.${svixTimestamp}.${rawBody}`;

  // Secret is "whsec_<base64>" — strip prefix and decode
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signingInput)
    .digest("base64");

  // svix-signature may contain multiple signatures: "v1,<sig1> v1,<sig2>"
  const signatures = svixSignature.split(" ").map((s) => s.replace(/^v1,/, ""));
  return signatures.some((sig) => sig === expected);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const valid = await verifyResendSignature(req, rawBody);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = payload.type as EmailEventType;
  const data = payload.data as Record<string, unknown> | undefined;

  pushEmailEvent({
    id: (payload.id as string) ?? crypto.randomUUID(),
    type,
    emailId: (data?.email_id as string) ?? "",
    to: (data?.to as string) ?? "",
    subject: (data?.subject as string) ?? undefined,
    createdAt: (data?.created_at as string) ?? new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
