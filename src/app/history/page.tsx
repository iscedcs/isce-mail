"use client";
import { useEffect, useState, useCallback } from "react";
import { SendHistoryEntry } from "@/lib/send-history";
import type { Job } from "@/lib/jobs";
import type { EmailEvent } from "@/lib/email-events";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoaderCircle } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const EVENT_COLOR: Record<string, string> = {
  "email.delivered": "bg-green-100 text-green-800",
  "email.bounced": "bg-red-100 text-red-800",
  "email.complained": "bg-orange-100 text-orange-800",
  "email.delivery_delayed": "bg-yellow-100 text-yellow-800",
  "email.opened": "bg-blue-100 text-blue-800",
  "email.clicked": "bg-purple-100 text-purple-800",
  "email.sent": "bg-gray-100 text-gray-700",
};

export default function SendHistoryPage() {
  const [tab, setTab] = useState<"history" | "jobs" | "events">("jobs");
  const [history, setHistory] = useState<SendHistoryEntry[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/send-history").then((r) => r.json()),
      fetch("/api/jobs").then((r) => r.json()).catch(() => []),
      fetch("/api/email-events").then((r) => r.json()).catch(() => []),
    ])
      .then(([h, j, e]) => {
        setHistory(h);
        setJobs(j);
        setEvents(e);
      })
      .finally(() => setLoading(false));
  }, []);

  // Auto-refresh every 4s when a job is running
  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => {
      const hasRunning = jobs.some(
        (j) => j.status === "pending" || j.status === "running",
      );
      if (hasRunning) fetchAll();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchAll, jobs]);

  const activeTab = (t: typeof tab) =>
    t === tab
      ? "border-b-2 border-black font-semibold text-black"
      : "text-gray-500 hover:text-black";

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring</h1>
          <p className="text-gray-500 text-sm mt-1">
            Live send jobs, delivery events, and send history.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll}>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b pb-0">
        {(["jobs", "events", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 capitalize text-sm ${activeTab(t)}`}>
            {t === "jobs"
              ? `Send Jobs (${jobs.length})`
              : t === "events"
                ? `Delivery Events (${events.length})`
                : `Send History (${history.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-8">
          <LoaderCircle className="animate-spin h-4 w-4" /> Loading…
        </div>
      ) : (
        <>
          {/* ── Send Jobs tab ── */}
          {tab === "jobs" && (
            <div className="space-y-3">
              {jobs.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">
                  No send jobs yet. Jobs appear here when you hit Send.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Sent</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="capitalize font-medium">
                          {job.type}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              job.basis === "PalmTechniq"
                                ? "default"
                                : "secondary"
                            }>
                            {job.basis}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {job.subject}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[job.status] ?? "bg-gray-100"}`}>
                            {job.status === "running" ? (
                              <span className="flex items-center gap-1">
                                <LoaderCircle className="animate-spin h-3 w-3" />
                                running
                              </span>
                            ) : (
                              job.status
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-green-700">
                          {job.sent}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-600">
                          {job.failed}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {job.total}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(job.startedAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* ── Delivery Events tab ── */}
          {tab === "events" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={events.length === 0}
                  onClick={() =>
                    fetch("/api/email-events", { method: "DELETE" }).then(() =>
                      setEvents([]),
                    )
                  }>
                  Clear events
                </Button>
              </div>
              {events.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">
                  No delivery events yet. Configure the Resend webhook to{" "}
                  <code className="bg-gray-100 px-1 rounded text-xs">
                    /api/webhooks/resend
                  </code>{" "}
                  in the Resend dashboard.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${EVENT_COLOR[ev.type] ?? "bg-gray-100"}`}>
                            {ev.type.replace("email.", "")}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {ev.to}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {ev.subject ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(ev.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* ── Send History tab ── */}
          {tab === "history" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={history.length === 0}
                  onClick={() =>
                    fetch("/api/send-history", { method: "DELETE" }).then(() =>
                      setHistory([]),
                    )
                  }>
                  Clear history
                </Button>
              </div>
              {history.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">
                  No send history yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Recipients</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <span className="capitalize font-medium">
                            {entry.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.basis === "PalmTechniq"
                                ? "default"
                                : "secondary"
                            }>
                            {entry.basis}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-sm">
                          {entry.subject}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {entry.recipientCount}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(entry.sentAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
