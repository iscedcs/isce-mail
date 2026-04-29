/**
 * In-memory job store for fire-and-forget email sends.
 * Each job tracks progress (pending → running → done/failed).
 * Stores up to MAX_JOBS (newest first). Cleared on server restart.
 */

export type JobStatus = "pending" | "running" | "done" | "failed";

export interface Job {
  id: string;
  type: string; // "course-promo", "newsletter", etc.
  basis: string; // "ISCE" | "PalmTechniq"
  subject: string;
  status: JobStatus;
  total: number;
  sent: number;
  failed: number;
  error?: string;
  startedAt: string; // ISO
  completedAt?: string; // ISO
}

const MAX_JOBS = 100;
const jobs = new Map<string, Job>();
const jobOrder: string[] = []; // newest-first insertion order

export function createJob(
  params: Pick<Job, "type" | "basis" | "subject" | "total">,
): Job {
  const id = crypto.randomUUID();
  const job: Job = {
    id,
    ...params,
    status: "pending",
    sent: 0,
    failed: 0,
    startedAt: new Date().toISOString(),
  };
  jobs.set(id, job);
  jobOrder.unshift(id);
  if (jobOrder.length > MAX_JOBS) {
    const removed = jobOrder.pop()!;
    jobs.delete(removed);
  }
  return job;
}

export function updateJob(id: string, patch: Partial<Job>): Job | null {
  const job = jobs.get(id);
  if (!job) return null;
  const updated = { ...job, ...patch };
  jobs.set(id, updated);
  return updated;
}

export function getJob(id: string): Job | null {
  return jobs.get(id) ?? null;
}

export function listJobs(): Job[] {
  return jobOrder.map((id) => jobs.get(id)!).filter(Boolean);
}
