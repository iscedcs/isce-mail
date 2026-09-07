/**
 * Persistent job store  saved to data/jobs.json.
 * Tracks fire-and-forget email send progress.
 */

import fs from "fs";
import path from "path";

export type JobStatus = "pending" | "running" | "scheduled" | "done" | "failed";

export interface Job {
  id: string;
  type: string;
  basis: string;
  subject: string;
  status: JobStatus;
  total: number;
  sent: number;
  failed: number;
  error?: string;
  /** Campaign ID, if this job is backed by a Campaign record. */
  campaignId?: string;
  /** ISO  if set this job should not run until this time. */
  scheduledFor?: string;
  startedAt: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "jobs.json");
const MAX_JOBS = 200;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readAll(): Job[] {
  ensureDataDir();
  if (!fs.existsSync(FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as Job[];
  } catch {
    return [];
  }
}

function writeAll(jobs: Job[]): void {
  ensureDataDir();
  // Keep only newest MAX_JOBS
  const trimmed = jobs.slice(0, MAX_JOBS);
  fs.writeFileSync(FILE, JSON.stringify(trimmed, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Public API (unchanged signature for backwards compat)
// ---------------------------------------------------------------------------

export function createJob(
  params: Pick<Job, "type" | "basis" | "subject" | "total"> & {
    campaignId?: string;
    scheduledFor?: string;
  },
): Job {
  const jobs = readAll();
  const job: Job = {
    ...params,
    id: crypto.randomUUID(),
    status: params.scheduledFor ? "scheduled" : "pending",
    sent: 0,
    failed: 0,
    startedAt: new Date().toISOString(),
  };
  jobs.unshift(job);
  writeAll(jobs);
  return job;
}

export function updateJob(id: string, patch: Partial<Job>): Job | null {
  const jobs = readAll();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) return null;
  const updated = { ...jobs[idx], ...patch };
  jobs[idx] = updated;
  writeAll(jobs);
  return updated;
}

export function getJob(id: string): Job | null {
  return readAll().find((j) => j.id === id) ?? null;
}

export function listJobs(): Job[] {
  return readAll();
}
