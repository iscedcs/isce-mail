import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { pushEmailEvent, EmailEventType } from "@/lib/email-events";
import { recordEvent, findRecipientByResendId } from "@/lib/campaigns";
import { recordWebhookEventInDb } from "@/lib/campaign-db";

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
      console.warn(
        "[webhook] RESEND_WEBHOOK_SECRET not set, allowing in development mode.",
      );
      return true;
    }
    return false;
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Reject events older than 24 hours to allow retries and manual replays
  const ts = parseInt(svixTimestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 86400) return false;

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
const EVENT_TO_STAT: Record<
  string,
  "delivered" | "opened" | "clicked" | "bounced" | "complained"
> = {
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.suppressed": "bounced",
  "email.failed": "bounced",
  "email.complained": "complained",
};

export async function POST(req: NextRequest) {
  try {
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

    const type = (payload.type as string) ?? "";

    // Gracefully acknowledge non-email events (contacts, domains, etc.) without failing
    if (!type.startsWith("email.")) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const emailEventType = type as EmailEventType;
    const data = payload.data as Record<string, unknown> | undefined;
    const emailId = (data?.email_id as string) ?? "";
    const rawTo = data?.to;
    const to = Array.isArray(rawTo)
      ? rawTo.join(", ")
      : typeof rawTo === "string"
        ? rawTo
        : "";

    // Extract bounce / suppression / failure details if present
    const bounceInfo = data?.bounce as
      | { message?: string; type?: string; sub_type?: string }
      | undefined;
    let bounceReason = bounceInfo
      ? [bounceInfo.type, bounceInfo.sub_type, bounceInfo.message]
          .filter(Boolean)
          .join(" - ")
      : undefined;

    if (!bounceReason) {
      if (type === "email.suppressed") {
        bounceReason = "Suppressed: Recipient address is on suppression list";
      } else if (type === "email.failed") {
        bounceReason = (data?.error as string) || "Delivery failed";
      }
    }

    // --- Campaign attribution ---
    let campaignId: string | undefined;
    let recipientEmail: string | undefined;

    if (emailId) {
      try {
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
      } catch (err) {
        console.error("[webhook] Error finding or updating recipient:", err);
      }
    }

    // Push to event log with enriched fields
    try {
      pushEmailEvent({
        id: (payload.id as string) ?? crypto.randomUUID(),
        type: emailEventType,
        emailId,
        to,
        subject: (data?.subject as string) ?? undefined,
        campaignId,
        recipientEmail,
        bounceReason,
        createdAt: (data?.created_at as string) ?? new Date().toISOString(),
      });
    } catch (err) {
      console.error("[webhook] Error recording email event:", err);
    }

    // Persist to Neon Postgres via Prisma (updates recipient, campaign, and marks bounced/suppressed contacts)
    try {
      await recordWebhookEventInDb({
        resendEmailId: emailId,
        eventType: type,
        recipientEmail: recipientEmail || (to.includes("@") ? to.split(",")[0].trim() : undefined),
        bounceReason,
      });
    } catch (dbErr) {
      console.error("[webhook] Error recording event in Neon DB via Prisma:", dbErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] Fatal unhandled error in POST handler:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
