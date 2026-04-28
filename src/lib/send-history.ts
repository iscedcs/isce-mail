/**
 * In-memory send history log.
 * Persists for the lifetime of the server process (cleared on restart).
 * Stores up to MAX_ENTRIES entries (newest first).
 */

export interface SendHistoryEntry {
  id: string;
  type: string; // "welcome", "newsletter", etc.
  basis: string; // "ISCE" | "PalmTechniq"
  subject: string;
  recipientCount: number;
  sentAt: string; // ISO timestamp
}

const MAX_ENTRIES = 200;

// Module-level singleton — persists across requests in the same process
const history: SendHistoryEntry[] = [];

export function logSend(entry: Omit<SendHistoryEntry, "id" | "sentAt">): void {
  const record: SendHistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    sentAt: new Date().toISOString(),
  };
  history.unshift(record);
  if (history.length > MAX_ENTRIES) {
    history.splice(MAX_ENTRIES);
  }
}

export function getSendHistory(): SendHistoryEntry[] {
  return [...history];
}

export function clearSendHistory(): void {
  history.splice(0, history.length);
}
