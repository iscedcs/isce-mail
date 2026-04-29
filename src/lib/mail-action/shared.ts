import { Resend } from "resend";
import { ReactElement } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IBasis = "ISCE" | "PalmTechniq";

/** A single recipient with their display name (for personalisation). */
export type BatchRecipient = {
  email: string;
  /** Full name from the sync, or whatever is available. Used for {{firstName}}, {{name}} tokens. */
  name: string;
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
  const firstName = recipient.name ? recipient.name.split(" ")[0] : "there";
  return template
    .replace(/\{\{firstName\}\}/gi, firstName)
    .replace(/\{\{name\}\}/gi, recipient.name || firstName)
    .replace(/\{\{email\}\}/gi, recipient.email);
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
 * Parse a comma-separated email string into BatchRecipient[].
 * Names will be empty — personalisation will fall back to "there".
 */
export function parseEmailString(emails: string): BatchRecipient[] {
  return emails
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((email) => ({ email, name: "" }));
}

/** Format a recipient count for the success message. */
export function recipientLabel(count: number): string {
  return count === 1 ? "1 recipient" : `${count} recipients`;
}

// ---------------------------------------------------------------------------
// Tracked batch — returns per-email sent/failed counts
// ---------------------------------------------------------------------------

export interface BatchResult {
  sent: number;
  failed: number;
}

/**
 * Same as sendBatch but tracks per-email success/failure.
 * Used by fire-and-forget API routes so job status is accurate.
 */
export async function sendBatchTracked(
  resend: Resend,
  payloads: EmailPayload[],
): Promise<BatchResult> {
  if (payloads.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < payloads.length; i += RESEND_BATCH_LIMIT) {
    const chunk = payloads.slice(i, i + RESEND_BATCH_LIMIT);
    try {
      const result = await resend.batch.send(chunk);
      if (result.error) {
        failed += chunk.length;
      } else {
        for (const item of result.data ?? []) {
          if (item?.id) sent++;
          else failed++;
        }
      }
    } catch {
      failed += chunk.length;
    }
  }

  return { sent, failed };
}
