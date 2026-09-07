"use client";
import { useEffect, useState, useCallback } from "react";
import type { Job } from "@/lib/jobs";
import type { EmailEvent } from "@/lib/email-events";
import type { Campaign } from "@/lib/campaigns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LoaderCircle,
  Mail,
  Eye,
  MousePointerClick,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ChevronLeft,
  Trash2,
  RefreshCw,
  CalendarClock,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800",
  scheduled: "bg-purple-100 text-purple-800",
  done: "bg-green-100 text-green-800",
  sent: "bg-green-100 text-green-800",
  sending: "bg-blue-100 text-blue-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
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

function StatChip({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${color}`}
      title={label}
    >
      {icon}
      <span>{value}</span>
    </div>
  );
}

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

function pct(num: number, denom: number) {
  if (!denom) return "0%";
  return `${Math.round((num / denom) * 100)}%`;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

type Tab = "campaigns" | "scheduled" | "audience" | "events" | "jobs";

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/campaigns").then((r) => r.json()).catch(() => []),
      fetch("/api/jobs").then((r) => r.json()).catch(() => []),
      fetch("/api/email-events").then((r) => r.json()).catch(() => []),
    ])
      .then(([c, j, e]) => {
        setCampaigns(Array.isArray(c) ? c : []);
        setJobs(Array.isArray(j) ? j : []);
        setEvents(Array.isArray(e) ? e : []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const openAudience = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setTab("audience");
  };

  const cancelCampaign = async (id: string) => {
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const scheduledCampaigns = campaigns.filter((c) => c.status === "scheduled");
  const sentCampaigns = campaigns.filter(
    (c) => c.status === "sent" || c.status === "sending" || c.status === "failed",
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track sends, scheduled emails, and audience engagement
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => (window.location.href = "/")}>
            <Mail className="h-4 w-4 mr-1.5" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Campaigns",
            value: campaigns.length,
            icon: <Mail className="h-5 w-5 text-indigo-500" />,
            bg: "bg-indigo-50",
          },
          {
            label: "Scheduled",
            value: scheduledCampaigns.length,
            icon: <Clock className="h-5 w-5 text-purple-500" />,
            bg: "bg-purple-50",
          },
          {
            label: "Total Opens",
            value: campaigns.reduce((s, c) => s + (c.stats?.opened ?? 0), 0),
            icon: <Eye className="h-5 w-5 text-blue-500" />,
            bg: "bg-blue-50",
          },
          {
            label: "Total Clicks",
            value: campaigns.reduce((s, c) => s + (c.stats?.clicked ?? 0), 0),
            icon: <MousePointerClick className="h-5 w-5 text-green-500" />,
            bg: "bg-green-50",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`${card.bg} rounded-xl p-4 flex items-center gap-3`}
          >
            {card.icon}
            <div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-4">
        {(
          [
            { id: "campaigns", label: "Campaigns" },
            { id: "scheduled", label: `Scheduled (${scheduledCampaigns.length})` },
            { id: "audience", label: "Audience Detail" },
            { id: "events", label: "Delivery Events" },
            { id: "jobs", label: "Jobs" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoaderCircle className="animate-spin h-8 w-8 text-gray-400" />
        </div>
      ) : (
        <>
          {/* --- CAMPAIGNS TAB --- */}
          {tab === "campaigns" && (
            <div className="space-y-3">
              {sentCampaigns.length === 0 ? (
                <p className="text-gray-400 text-sm py-12 text-center">
                  No sent campaigns yet. Send an email from any template to see it here.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Recipients</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentCampaigns.map((c) => (
                      <TableRow key={c.id} className="hover:bg-gray-50">
                        <TableCell className="capitalize font-medium text-sm">
                          {c.type}
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.basis === "PalmTechniq" ? "default" : "secondary"}>
                            {c.basis}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm">
                          {c.subject}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[c.status] ?? "bg-gray-100"}`}
                          >
                            {c.status === "sending" ? (
                              <span className="flex items-center gap-1">
                                <LoaderCircle className="animate-spin h-3 w-3" />
                                sending
                              </span>
                            ) : (
                              c.status
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {c.stats.total}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <StatChip
                              icon={<Send className="h-3 w-3" />}
                              value={c.stats.sent}
                              label="Sent"
                              color="bg-gray-100 text-gray-700"
                            />
                            <StatChip
                              icon={<Eye className="h-3 w-3" />}
                              value={c.stats.opened}
                              label={`Opened (${pct(c.stats.opened, c.stats.delivered)})`}
                              color="bg-blue-100 text-blue-700"
                            />
                            <StatChip
                              icon={<MousePointerClick className="h-3 w-3" />}
                              value={c.stats.clicked}
                              label="Clicked"
                              color="bg-purple-100 text-purple-700"
                            />
                            {c.stats.bounced > 0 && (
                              <StatChip
                                icon={<AlertTriangle className="h-3 w-3" />}
                                value={c.stats.bounced}
                                label="Bounced"
                                color="bg-red-100 text-red-700"
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                          {fmt(c.sentAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAudience(c)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* --- SCHEDULED TAB --- */}
          {tab === "scheduled" && (
            <div className="space-y-3">
              {scheduledCampaigns.length === 0 ? (
                <p className="text-gray-400 text-sm py-12 text-center">
                  No scheduled campaigns. Choose a{" "}
                  <a href="/" className="text-indigo-600 underline">
                    template
                  </a>{" "}
                  to compose and schedule one.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Recipients</TableHead>
                      <TableHead>Scheduled For</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledCampaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="capitalize font-medium text-sm">
                          {c.type}
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.basis === "PalmTechniq" ? "default" : "secondary"}>
                            {c.basis}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {c.subject}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {c.recipients.length}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-purple-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {fmt(c.scheduledFor)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => cancelCampaign(c.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Cancel
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* --- AUDIENCE DETAIL TAB --- */}
          {tab === "audience" && (
            <div className="space-y-4">
              {!selectedCampaign ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">
                    Select a campaign from the{" "}
                    <button
                      className="text-indigo-600 underline"
                      onClick={() => setTab("campaigns")}
                    >
                      Campaigns
                    </button>{" "}
                    tab to view its audience.
                  </p>
                </div>
              ) : (
                <>
                  {/* Campaign header */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setTab("campaigns")}
                      className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </button>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedCampaign.subject}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {selectedCampaign.type}  {selectedCampaign.basis} {" "}
                        {selectedCampaign.recipients.length} recipients
                      </p>
                    </div>
                    {/* Mini stats */}
                    <div className="flex gap-2">
                      {[
                        {
                          icon: <Send className="h-3.5 w-3.5" />,
                          v: selectedCampaign.stats.sent,
                          c: "bg-gray-100 text-gray-700",
                          label: "sent",
                        },
                        {
                          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                          v: selectedCampaign.stats.delivered,
                          c: "bg-green-100 text-green-700",
                          label: "delivered",
                        },
                        {
                          icon: <Eye className="h-3.5 w-3.5" />,
                          v: selectedCampaign.stats.opened,
                          c: "bg-blue-100 text-blue-700",
                          label: `${pct(selectedCampaign.stats.opened, selectedCampaign.stats.delivered)} open rate`,
                        },
                        {
                          icon: <MousePointerClick className="h-3.5 w-3.5" />,
                          v: selectedCampaign.stats.clicked,
                          c: "bg-purple-100 text-purple-700",
                          label: "clicked",
                        },
                        {
                          icon: <XCircle className="h-3.5 w-3.5" />,
                          v: selectedCampaign.stats.bounced,
                          c: "bg-red-100 text-red-700",
                          label: "bounced",
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${s.c}`}
                          title={s.label}
                        >
                          {s.icon}
                          <span>{s.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recipient table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Delivered</TableHead>
                        <TableHead>Opened</TableHead>
                        <TableHead>Clicked</TableHead>
                        <TableHead>Bounced</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCampaign.recipients.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{r.email}</TableCell>
                          <TableCell className="text-sm">{r.firstname || ""}</TableCell>
                          <TableCell>
                            {r.events.delivered ? (
                              <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {new Date(r.events.delivered).toLocaleTimeString()}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300"></span>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.events.opened ? (
                              <span className="text-xs text-blue-700 font-medium flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                {new Date(r.events.opened).toLocaleTimeString()}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300"></span>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.events.clicked ? (
                              <span className="text-xs text-purple-700 font-medium flex items-center gap-1">
                                <MousePointerClick className="h-3.5 w-3.5" />
                                {new Date(r.events.clicked).toLocaleTimeString()}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300"></span>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.events.bounced ? (
                              <div>
                                <span className="text-xs text-red-700 font-medium flex items-center gap-1">
                                  <XCircle className="h-3.5 w-3.5" />
                                  {new Date(r.events.bounced).toLocaleTimeString()}
                                </span>
                                {r.events.bounceReason && (
                                  <p className="text-[11px] text-red-600 font-medium mt-0.5 max-w-[180px]">
                                    {r.events.bounceReason}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>
          )}

          {/* --- DELIVERY EVENTS TAB --- */}
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
                  }
                >
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
                      <TableHead>Campaign</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${EVENT_COLOR[ev.type] ?? "bg-gray-100"}`}
                          >
                            {ev.type.replace("email.", "")}
                          </span>
                          {ev.bounceReason && (
                            <p className="text-[11px] text-red-600 font-medium mt-1 max-w-[200px]">
                              {ev.bounceReason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-mono">{ev.to}</TableCell>
                        <TableCell className="max-w-[160px] truncate text-sm">
                          {ev.subject ?? ""}
                        </TableCell>
                        <TableCell className="text-xs text-gray-400">
                          {ev.campaignId
                            ? campaigns.find((c) => c.id === ev.campaignId)?.subject ??
                              ev.campaignId.slice(0, 8) + ""
                            : ""}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                          {new Date(ev.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* --- JOBS TAB --- */}
          {tab === "jobs" && (
            <div className="space-y-3">
              {jobs.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">No jobs yet.</p>
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
                        <TableCell className="capitalize font-medium">{job.type}</TableCell>
                        <TableCell>
                          <Badge variant={job.basis === "PalmTechniq" ? "default" : "secondary"}>
                            {job.basis}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {job.subject}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[job.status] ?? "bg-gray-100"}`}
                          >
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
        </>
      )}
    </div>
  );
}
