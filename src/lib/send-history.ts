/**
 * Persistent send history log  saved to data/history.json.
 */

import fs from "fs";
import path from "path";

export interface SendHistoryEntry {
  id: string;
  type: string;
  basis: string;
  subject: string;
  recipientCount: number;
  sentAt: string;
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "history.json");
const MAX_ENTRIES = 500;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): SendHistoryEntry[] {
  ensureDataDir();
  if (!fs.existsSync(FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as SendHistoryEntry[];
  } catch {
    return [];
  }
}

function writeAll(entries: SendHistoryEntry[]): void {
  ensureDataDir();
  fs.writeFileSync(
    FILE,
    JSON.stringify(entries.slice(0, MAX_ENTRIES), null, 2),
    "utf-8",
  );
}

// ---------------------------------------------------------------------------
// Public API (unchanged signature for backwards compat)
// ---------------------------------------------------------------------------

export function logSend(entry: Omit<SendHistoryEntry, "id" | "sentAt">): void {
  const history = readAll();
  history.unshift({
    ...entry,
    id: crypto.randomUUID(),
    sentAt: new Date().toISOString(),
  });
  writeAll(history);
}

export function getSendHistory(): SendHistoryEntry[] {
  return readAll();
}

export function clearSendHistory(): void {
  writeAll([]);
}
