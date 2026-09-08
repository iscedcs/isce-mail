/**
 * Persistent email event store  saved to data/events.json.
 * Events are pushed when Resend POSTs to /api/webhooks/resend.
 */

import fs from "fs";
import path from "path";

export type EmailEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.bounced"
  | "email.suppressed"
  | "email.failed"
  | "email.complained"
  | "email.opened"
  | "email.clicked";

export interface EmailEvent {
  id: string;
  type: EmailEventType;
  emailId: string;
  to: string;
  subject?: string;
  /** Links this event back to a campaign record. */
  campaignId?: string;
  /** The recipient email this event belongs to (denormalised for display). */
  recipientEmail?: string;
  /** Bounce or suppression reason if applicable */
  bounceReason?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "events.json");
const MAX_EVENTS = 1000;

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn("[email-events] Could not create data dir:", err);
  }
}

function readAll(): EmailEvent[] {
  ensureDataDir();
  if (!fs.existsSync(FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as EmailEvent[];
  } catch {
    return [];
  }
}

function writeAll(events: EmailEvent[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(
      FILE,
      JSON.stringify(events.slice(0, MAX_EVENTS), null, 2),
      "utf-8",
    );
  } catch (err) {
    console.error("[email-events] Failed to write events to disk:", err);
  }
}

// ---------------------------------------------------------------------------
// Public API (unchanged signature for backwards compat + new fields)
// ---------------------------------------------------------------------------

export function pushEmailEvent(event: EmailEvent): void {
  const events = readAll();
  events.unshift(event);
  writeAll(events);
}

export function getEmailEvents(limit = 200): EmailEvent[] {
  return readAll().slice(0, limit);
}

export function clearEmailEvents(): void {
  writeAll([]);
}
