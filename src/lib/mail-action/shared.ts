import { Resend } from "resend";
import { ReactElement } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IBasis = "ISCE" | "PalmTechniq";

/** A single recipient with their display name (for personalisation). */
export type BatchRecipient = {
  email: string;
  name: string;
  url?: string;
};

export interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  react: ReactElement;
}

// ---------------------------------------------------------------------------
// Resend instances — one per brand
// ---------------------------------------------------------------------------

const palmtechniqResend = new Resend(process.env.PALMTECHNIQ_RESEND_API_KEY);
const isceResend = new Resend(process.env.ISCE_RESEND_API_KEY);

export function getResendInstance(basis: IBasis): Resend {
  return basis === "PalmTechniq" ? palmtechniqResend : isceResend;
}

export function getSenderAddress(basis: IBasis): string {
  return basis === "PalmTechniq"
    ? "PalmTechnIQ <support@palmtechniq.com>"
    : "ISCE Team <hello@isce.tech>";
}

// ---------------------------------------------------------------------------
// Personalisation
// ---------------------------------------------------------------------------

/**
 * Replace template tokens in a message string.
 *
 * Supported tokens:
 *   {{firstName}}  — first word of the recipient's name
 *   {{name}}       — full name
 *   {{email}}      — recipient email address
 *
 * Falls back gracefully: if name is empty, {{firstName}} → "there".
 */
export function interpolate(
  template: string,
  recipient: BatchRecipient,
): string {
  if (!template) return "";
  const firstName = recipient.name
    ? recipient.name.trim().split(" ")[0]
    : recipient.email
      ? recipient.email.split("@")[0].replace(/[._-]+/g, " ")
      : "there";
  const fullName = recipient.name ? recipient.name.trim() : firstName;

  return template
    .replace(/\{\{firstName\}\}/gi, firstName)
    .replace(/\{\{name\}\}/gi, fullName)
    .replace(/\{\{email\}\}/gi, recipient.email)
    .replace(/\{\{url\}\}/gi, recipient.url || "");
}

// ---------------------------------------------------------------------------
// True batching
// ---------------------------------------------------------------------------

const RESEND_BATCH_LIMIT = 100;

/**
 * Send all payloads via Resend's batch endpoint, chunked to 100 per call.
 * Returns the count of successfully queued emails.
 */
export async function sendBatch(
  resend: Resend,
  payloads: EmailPayload[],
): Promise<number> {
  if (payloads.length === 0) return 0;

  let sent = 0;
  for (let i = 0; i < payloads.length; i += RESEND_BATCH_LIMIT) {
    const chunk = payloads.slice(i, i + RESEND_BATCH_LIMIT);
    await resend.batch.send(chunk);
    sent += chunk.length;
  }
  return sent;
}

// ---------------------------------------------------------------------------
// Helpers for server actions
// ---------------------------------------------------------------------------

/**
 * Parse an email input string into BatchRecipient[].
 * Supports:
 *   - Newline separated "email,firstname,url" or "email,name"
 *   - Comma-separated emails: "a@b.com, c@d.com"
 *   - Single email without commas: "a@b.com"
 */
export function parseEmailString(raw: string): BatchRecipient[] {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const recipients: BatchRecipient[] = [];
  const seen = new Set<string>();

  const isEmail = (s: string) => /^[^s@]+@[^s@]+\.[^s@]+$/.test(s);

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim());
    const emailParts = parts.filter((p) => isEmail(p));
    if (emailParts.length > 1) {
      for (const email of emailParts) {
        const clean = email.toLowerCase().trim();
        if (!seen.has(clean)) {
          seen.add(clean);
          recipients.push({ email: clean, name: "" });
        }
      }
    } else if (parts.length > 0 && isEmail(parts[0])) {
      const clean = parts[0].toLowerCase().trim();
      if (!seen.has(clean)) {
        seen.add(clean);
        recipients.push({
          email: clean,
          name: parts[1] || "",
          url: parts[2] || "",
        });
      }
    }
  }

  // Fallback for simple comma or whitespace-separated list
  if (recipients.length === 0 && raw.includes("@")) {
    const tokens = raw.split(/[,\s;]+/).map((t) => t.trim()).filter((t) => isEmail(t));
    for (const email of tokens) {
      const clean = email.toLowerCase();
      if (!seen.has(clean)) {
        seen.add(clean);
        recipients.push({ email: clean, name: "" });
      }
    }
  }

  return recipients;
}

export function recipientLabel(count: number): string {
  return count === 1 ? "1 recipient" : `${count} recipients`;
}

// ---------------------------------------------------------------------------
// Tracked batch — returns per-email sent/failed counts
// ---------------------------------------------------------------------------

export interface BatchResult {
  sent: number;
  failed: number;
  ids: { resendEmailId: string; email: string }[];
}

/**
 * Same as sendBatch but tracks per-email success/failure.
 * Used by fire-and-forget API routes so job status is accurate.
 */
export async function sendBatchTracked(
  resend: Resend,
  payloads: EmailPayload[],
): Promise<BatchResult> {
  if (payloads.length === 0) return { sent: 0, failed: 0, ids: [] };

  let sent = 0;
  let failed = 0;
  const ids: { resendEmailId: string; email: string }[] = [];

  for (let i = 0; i < payloads.length; i += RESEND_BATCH_LIMIT) {
    const chunk = payloads.slice(i, i + RESEND_BATCH_LIMIT);
    try {
      const result = await resend.batch.send(chunk);
      if (result.error) {
        failed += chunk.length;
      } else {
        const items = result.data?.data ?? [];
        for (let j = 0; j < chunk.length; j++) {
          const item = items[j];
          if (item?.id) {
            sent++;
            ids.push({ resendEmailId: item.id, email: chunk[j].to });
          } else {
            failed++;
          }
        }
      }
    } catch {
      failed += chunk.length;
    }
  }

  return { sent, failed, ids };
}
