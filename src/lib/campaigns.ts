/**
 * Campaign store  persisted to data/campaigns.json.
 *
 * A Campaign represents one batch send (immediate or scheduled).
 * It links every recipient's Resend email ID back for webhook attribution.
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CampaignRecipient {
  email: string;
  firstname: string;
  url?: string;
  batchNumber?: number;
  scheduledFor?: string | null;
  status?: string;
  bounceReason?: string;
  /** Set after Resend accepts the send — used to match webhook events. */
  resendEmailId?: string;
  /** Event timestamps populated by the Resend webhook. */
  events: {
    delivered?: string;
    opened?: string;
    clicked?: string;
    bounced?: string;
    complained?: string;
    bounceReason?: string;
  };
}

export interface CampaignBatch {
  batchNumber: number;
  count: number;
  status: "sent" | "scheduled" | "sending" | "pending";
  scheduledFor: string | null;
  sentAt?: string | null;
  recipients?: any[];
}

export type CampaignStatus =
  | "scheduled"
  | "sending"
  | "sent"
  | "completed"
  | "failed"
  | "cancelled";

export interface CampaignStats {
  total: number;
  sent: number;
  failed?: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained?: number;
}

export interface Campaign {
  id: string;
  type: string; // "appreciation" | "newsletter" | "event" etc.
  basis: string; // "ISCE" | "PalmTechniq"
  subject: string;
  message: string; // HTML snapshot at creation time
  link?: string;
  templateProps?: Record<string, any>;
  status: CampaignStatus;
  /** ISO timestamp — absent means send immediately. */
  scheduledFor?: string;
  /** ISO timestamp — set when dispatch completes. */
  sentAt?: string;
  completedAt?: string;
  recipients: CampaignRecipient[];
  batches?: CampaignBatch[];
  stats: CampaignStats;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "campaigns.json");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn("[campaigns] Could not create data dir:", err);
  }
}

function readAll(): Campaign[] {
  ensureDataDir();
  if (!fs.existsSync(FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as Campaign[];
  } catch {
    return [];
  }
}

function writeAll(campaigns: Campaign[]): void {
  try {
    ensureDataDir();
    fs.writeFileSync(FILE, JSON.stringify(campaigns, null, 2), "utf-8");
  } catch (err) {
    console.error("[campaigns] Failed to write campaigns to disk:", err);
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function createCampaign(
  params: Omit<Campaign, "id" | "createdAt" | "stats"> & {
    stats?: Partial<CampaignStats>;
  },
): Campaign {
  const campaigns = readAll();
  const campaign: Campaign = {
    ...params,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    stats: {
      total: params.recipients.length,
      sent: 0,
      failed: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      ...params.stats,
    },
  };
  campaigns.unshift(campaign);
  writeAll(campaigns);
  return campaign;
}

export function getCampaign(id: string): Campaign | null {
  return readAll().find((c) => c.id === id) ?? null;
}

export function listCampaigns(): Campaign[] {
  return readAll();
}

export function updateCampaign(
  id: string,
  patch: Partial<Campaign>,
): Campaign | null {
  const campaigns = readAll();
  const idx = campaigns.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updated = { ...campaigns[idx], ...patch };
  campaigns[idx] = updated;
  writeAll(campaigns);
  return updated;
}

export function cancelCampaign(id: string): Campaign | null {
  const campaign = getCampaign(id);
  if (!campaign || campaign.status !== "scheduled") return null;
  return updateCampaign(id, { status: "cancelled" });
}

/**
 * Given pairs of { resendEmailId, email }, link each Resend ID to the
 * matching recipient on the campaign so webhook events can be attributed.
 */
export function attachResendIds(
  campaignId: string,
  pairs: { resendEmailId: string; email: string }[],
): void {
  const campaigns = readAll();
  const idx = campaigns.findIndex((c) => c.id === campaignId);
  if (idx === -1) return;

  const emailToId = new Map(pairs.map((p) => [p.email, p.resendEmailId]));
  for (const r of campaigns[idx].recipients) {
    const rid = emailToId.get(r.email);
    if (rid) r.resendEmailId = rid;
  }
  writeAll(campaigns);
}

/**
 * Look up a campaign and recipient by their Resend email ID.
 */
export function findRecipientByResendId(resendEmailId: string): {
  campaign: Campaign;
  recipient: CampaignRecipient;
} | null {
  for (const campaign of readAll()) {
    const recipient = campaign.recipients.find(
      (r) => r.resendEmailId === resendEmailId,
    );
    if (recipient) return { campaign, recipient };
  }
  return null;
}

/**
 * Record a tracking event on the correct campaign + recipient.
 * Increments the campaign stats counter and timestamps the recipient event.
 */
export function recordEvent(
  resendEmailId: string,
  eventType: "delivered" | "opened" | "clicked" | "bounced" | "complained",
  detail?: string,
): void {
  const campaigns = readAll();
  let dirty = false;

  for (const campaign of campaigns) {
    const recipient = campaign.recipients.find(
      (r) => r.resendEmailId === resendEmailId,
    );
    if (recipient) {
      const now = new Date().toISOString();
      if (!recipient.events[eventType]) {
        recipient.events[eventType] = now;
        if (detail && eventType === "bounced") {
          recipient.events.bounceReason = detail;
        }
        campaign.stats[eventType] = (campaign.stats[eventType] ?? 0) + 1;
        dirty = true;
      }
      break;
    }
  }

  if (dirty) writeAll(campaigns);
}
