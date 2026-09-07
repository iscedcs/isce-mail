import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pushEmailEvent, EmailEventType } from "@/lib/email-events";
import { recordEvent, findRecipientByResendId } from "@/lib/campaigns";

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
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[webhook] RESEND_WEBHOOK_SECRET not set, allowing in development mode.");
      return true;
    }
    return false;
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Reject events older than 5 minutes
  const ts = parseInt(svixTimestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const signingInput = `${svixId}.${svixTimestamp}.${rawBody}`;

  // Secret is "whsec_<base64>"  strip prefix and decode
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signingInput)
    .digest("base64");

  // svix-signature may contain multiple signatures: "v1,<sig1> v1,<sig2>"
  const signatures = svixSignature.split(" ").map((s) => s.replace(/^v1,/, ""));
  return signatures.some((sig) => sig === expected);
}

// Map Resend event type to campaign stat key
const EVENT_TO_STAT: Partial<
  Record<
    EmailEventType,
    "delivered" | "opened" | "clicked" | "bounced" | "complained"
  >
> = {
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

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
  const emailId = (data?.email_id as string) ?? "";
  const rawTo = data?.to;
  const to = Array.isArray(rawTo) ? rawTo.join(", ") : (rawTo as string) ?? "";

  // Extract bounce / suppression details if present
  const bounceInfo = data?.bounce as
    | { message?: string; type?: string; sub_type?: string }
    | undefined;
  const bounceReason = bounceInfo
    ? [bounceInfo.type, bounceInfo.sub_type, bounceInfo.message]
        .filter(Boolean)
        .join(" - ")
    : undefined;

  // --- Campaign attribution ---
  let campaignId: string | undefined;
  let recipientEmail: string | undefined;

  if (emailId) {
    const match = findRecipientByResendId(emailId);
    if (match) {
      campaignId = match.campaign.id;
      recipientEmail = match.recipient.email;

      // Update per-recipient event + campaign stats counter
      const statKey = EVENT_TO_STAT[type];
      if (statKey) {
        recordEvent(emailId, statKey, bounceReason);
      }
    }
  }

  // Push to event log with enriched fields
  pushEmailEvent({
    id: (payload.id as string) ?? crypto.randomUUID(),
    type,
    emailId,
    to,
    subject: (data?.subject as string) ?? undefined,
    campaignId,
    recipientEmail,
    bounceReason,
    createdAt: (data?.created_at as string) ?? new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
