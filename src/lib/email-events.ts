/**
 * In-memory store for Resend delivery webhook events.
 * Events are pushed when Resend POSTs to /api/webhooks/resend.
 * Stores up to MAX_EVENTS (newest first). Cleared on server restart.
 */

export type EmailEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.bounced"
  | "email.complained"
  | "email.opened"
  | "email.clicked";

export interface EmailEvent {
  id: string; // Resend event ID
  type: EmailEventType;
  emailId: string; // Resend email ID
  to: string;
  subject?: string;
  createdAt: string; // ISO
}

const MAX_EVENTS = 500;
const events: EmailEvent[] = [];

export function pushEmailEvent(event: EmailEvent): void {
  events.unshift(event);
  if (events.length > MAX_EVENTS) {
    events.splice(MAX_EVENTS);
  }
}

export function getEmailEvents(limit = 200): EmailEvent[] {
  return events.slice(0, limit);
}

export function clearEmailEvents(): void {
  events.splice(0, events.length);
}
