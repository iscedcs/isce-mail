"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import type { Job } from "@/lib/jobs";
import type { EmailEvent } from "@/lib/email-events";
import type { Campaign } from "@/lib/campaigns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminLogin } from "@/components/admin/admin-login";
import { CampaignAnalytics } from "@/components/shared/campaign-analytics";
import { RecipientTable } from "@/components/shared/recipient-table";
import { getAdminSessionAction } from "@/actions/admin-auth";
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
  needs_review: "bg-amber-100 text-amber-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-500",
};

const EVENT_COLOR: Record<string, string> = {
  "email.delivered": "bg-green-100 text-green-800",
  "email.bounced": "bg-red-100 text-red-800",
  "email.suppressed": "bg-red-100 text-red-800",
  "email.failed": "bg-red-100 text-red-800",
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; role?: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [tab, setTab] = useState<Tab>("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; slug: string; primaryColor?: string }>>([]);
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<number | "all">("all");
  const [dispatchingBatch, setDispatchingBatch] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check admin session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        setAuthChecking(true);
        const data = await getAdminSessionAction();
        if (data.authenticated && data.user) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setAuthChecking(false);
      }
    };
    checkSession();
  }, []);

  const fetchAll = useCallback((options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? false;
    if (!isSilent) {
      setIsRefreshing(true);
    }
    Promise.all([
      fetch("/api/campaigns").then((r) => r.json()).catch(() => []),
      fetch("/api/jobs").then((r) => r.json()).catch(() => []),
      fetch("/api/email-events").then((r) => r.json()).catch(() => []),
      fetch("/api/products").then((r) => r.json()).catch(() => ({ products: [] })),
    ])
      .then(([c, j, e, p]) => {
        setCampaigns(Array.isArray(c) ? c : []);
        setJobs(Array.isArray(j) ? j : []);
        setEvents(Array.isArray(e) ? e : []);
        if (p && Array.isArray(p.products)) {
          setProducts(p.products);
        }
      })
      .finally(() => {
        setInitialLoading(false);
        if (!isSilent) {
          setIsRefreshing(false);
        }
      });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAll({ silent: false });
    // Silent background poll every 30s without reloading the page or flashing a loader
    const interval = setInterval(() => {
      fetchAll({ silent: true });
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll, isAuthenticated]);

  // Re-point the open campaign at its refreshed copy whenever the poll lands.
  useEffect(() => {
    setSelectedCampaign((current) =>
      current ? (campaigns.find((c) => c.id === current.id) ?? current) : current,
    );
  }, [campaigns]);

  const openAudience = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setSelectedBatch("all");
    setTab("audience");
  };

  const cancelCampaign = async (id: string) => {
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const handleDispatchBatch = async (campaignId: string, batchNumber: number) => {
    setDispatchingBatch(batchNumber);
    try {
      // A batch larger than one serverless invocation can handle comes back with
      // `done: false` and the rest still queued. Keep calling until it drains —
      // each call picks up exactly where the last one stopped.
      const MAX_ROUNDS = 40;

      for (let round = 0; round < MAX_ROUNDS; round++) {
        const res = await fetch(`/api/campaigns/${campaignId}/dispatch-batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Explicit manual override: requeue failed/needs_review rows AND send
          // ahead of the batch's scheduled date. That is what the button means.
          body: JSON.stringify({
            batchNumber,
            includeFailed: true,
            ignoreSchedule: true,
          }),
        });
        const data = await res
          .json()
          .catch(() => ({ error: `Server returned HTTP ${res.status}` }));

        if (!res.ok) {
          alert(data.error || "Failed to dispatch batch");
          break;
        }

        if (data.done !== false) break;
      }

      // Re-read the LIST endpoint, not /api/campaigns/[id]: the detail route
      // returns { campaign, batches }, a different shape from the normalized
      // Campaign this panel renders against.
      await fetchAll();
      const listRes = await fetch("/api/campaigns");
      if (listRes.ok) {
        const list = await listRes.json();
        const fresh = Array.isArray(list)
          ? list.find((c: Campaign) => c.id === campaignId)
          : null;
        if (fresh) setSelectedCampaign(fresh);
      }
    } catch (e: any) {
      alert(e?.message || "Network error while dispatching batch.");
    } finally {
      setDispatchingBatch(null);
    }
  };

  interface ScheduledItem {
    id: string;
    campaignId: string;
    campaign: Campaign;
    isBatch: boolean;
    batchNumber?: number;
    batchCount?: number;
    totalBatches?: number;
    recipientCount: number;
    scheduledFor: string | null;
    subject: string;
    type: string;
    basis: string;
  }

  // Compute all scheduled dispatches: both future scheduled campaigns and upcoming scheduled batches
  const scheduledItems: ScheduledItem[] = [];
  for (const c of campaigns) {
    if (c.batches && c.batches.length > 0) {
      const pendingBatches = c.batches.filter((b: any) => b.status === "scheduled");
      for (const b of pendingBatches) {
        scheduledItems.push({
          id: `${c.id}-batch-${b.batchNumber}`,
          campaignId: c.id,
          campaign: c,
          isBatch: true,
          batchNumber: b.batchNumber,
          batchCount: b.count,
          totalBatches: c.batches.length,
          recipientCount: b.count,
          scheduledFor: b.scheduledFor || c.scheduledFor || null,
          subject: c.subject,
          type: c.type,
          basis: c.basis,
        });
      }
    } else if (c.status === "scheduled") {
      scheduledItems.push({
        id: c.id,
        campaignId: c.id,
        campaign: c,
        isBatch: false,
        recipientCount: c.recipients?.length || c.stats?.total || 0,
        scheduledFor: c.scheduledFor || null,
        subject: c.subject,
        type: c.type,
        basis: c.basis,
      });
    }
  }

  scheduledItems.sort((a, b) => {
    const timeA = a.scheduledFor ? new Date(a.scheduledFor).getTime() : 0;
    const timeB = b.scheduledFor ? new Date(b.scheduledFor).getTime() : 0;
    return timeA - timeB;
  });

  const productMap = new Map(products.map((p) => [p.slug.toLowerCase(), p]));

  const getBrandInfo = (basis?: string) => {
    const slug = (basis || "").toLowerCase();
    const found = productMap.get(slug);
    if (found) {
      return { name: found.name, color: found.primaryColor || "#0f172a" };
    }
    if (slug === "palmtechniq") return { name: "PalmTechnIQ", color: "#021A1A" };
    if (slug === "isce") return { name: "ISCE Tech", color: "#000000" };
    return { name: basis || "Unknown", color: "#475569" };
  };

  const filteredScheduledItems = scheduledItems.filter((item) => {
    if (selectedProductFilter === "all") return true;
    return (item.basis || "").toLowerCase() === selectedProductFilter.toLowerCase();
  });

  const filteredCampaigns = campaigns.filter((c) => {
    if (selectedProductFilter === "all") return true;
    return (c.basis || "").toLowerCase() === selectedProductFilter.toLowerCase();
  });

  const sentCampaigns = filteredCampaigns.filter(
    (c) => c.status === "sent" || c.status === "sending" || c.status === "completed" || c.status === "failed",
  );

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500 font-medium">Verifying admin session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <AdminHeader />
        <AdminLogin
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthenticated(true);
            fetchAll();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <AdminHeader
        currentUser={currentUser}
        onLogout={() => {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }}
        onRefresh={() => fetchAll({ silent: false })}
        isRefreshing={isRefreshing}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track sends, scheduled emails, and audience engagement across all brands
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => (window.location.href = "/admin/products")}>
            Manage Brands
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchAll({ silent: false })} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => (window.location.href = "/")}>
            <Mail className="h-4 w-4 mr-1.5" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Brand Filter Pills */}
      {products.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-xs">
          <span className="text-muted-foreground font-medium mr-1">Brand Filter:</span>
          <button
            onClick={() => setSelectedProductFilter("all")}
            className={`px-3 py-1 rounded-full font-medium transition-all ${
              selectedProductFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Brands ({campaigns.length})
          </button>
          {products.map((p) => {
            const count = campaigns.filter(
              (c) => (c.basis || "").toLowerCase() === p.slug.toLowerCase(),
            ).length;
            const isSelected = selectedProductFilter.toLowerCase() === p.slug.toLowerCase();
            return (
              <button
                key={p.id || p.slug}
                onClick={() => setSelectedProductFilter(p.slug)}
                className={`px-3 py-1 rounded-full font-medium flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block border border-black/10"
                  style={{ backgroundColor: p.primaryColor || "#000" }}
                />
                <span>{p.name}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      )}

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
            value: scheduledItems.length,
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
            { id: "scheduled", label: `Scheduled (${scheduledItems.length})` },
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
      {initialLoading ? (
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
                          {(() => {
                            const brand = getBrandInfo(c.basis);
                            return (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-xs"
                                style={{ backgroundColor: brand.color }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                                {brand.name}
                              </span>
                            );
                          })()}
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
              {filteredScheduledItems.length === 0 ? (
                <p className="text-gray-400 text-sm py-12 text-center">
                  No scheduled campaigns or queued batches. Choose a{" "}
                  <Link href="/" className="text-indigo-600 underline">
                    template
                  </Link>{" "}
                  to compose and schedule one.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Dispatch Plan</TableHead>
                      <TableHead className="text-right">Recipients</TableHead>
                      <TableHead>Scheduled For</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScheduledItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell className="capitalize font-medium text-sm">
                          {item.type}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const brand = getBrandInfo(item.basis);
                            return (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-white shadow-xs"
                                style={{ backgroundColor: brand.color }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                                {brand.name}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm font-medium text-gray-900">
                          {item.subject}
                        </TableCell>
                        <TableCell>
                          {item.isBatch ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                              <CalendarClock className="w-3 h-3 text-purple-600" />
                              Batch #{item.batchNumber} of {item.totalBatches}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              Full Campaign
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">
                          {item.recipientCount}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-purple-700 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {fmt(item.scheduledFor || undefined)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.isBatch && item.batchNumber ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-semibold"
                                disabled={dispatchingBatch === item.batchNumber}
                                onClick={() => handleDispatchBatch(item.campaignId, item.batchNumber!)}
                              >
                                {dispatchingBatch === item.batchNumber ? (
                                  <>
                                    <LoaderCircle className="h-3.5 w-3.5 animate-spin mr-1" />
                                    Dispatching...
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-3.5 w-3.5 mr-1" />
                                    Send Batch {item.batchNumber} Now
                                  </>
                                )}
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-medium"
                              onClick={() => {
                                setSelectedCampaign(item.campaign);
                                if (item.isBatch && item.batchNumber) {
                                  setSelectedBatch(item.batchNumber);
                                } else {
                                  setSelectedBatch("all");
                                }
                                setTab("audience");
                              }}
                            >
                              View Audience
                            </Button>
                            {!item.isBatch && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8"
                                onClick={() => cancelCampaign(item.campaignId)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </div>
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
                  </div>

                  {/* Performance visuals — funnel, rates, engagement curve.
                      Numbers are derived from per-recipient timestamps rather
                      than the Campaign.stats counters, which double-count when
                      Resend sends an open without a prior delivered event. */}
                  <CampaignAnalytics batches={(selectedCampaign.batches ?? []) as any} />

                  {/* Batch Segment Bar */}
                  {selectedCampaign.batches && selectedCampaign.batches.length > 1 && (
                    <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-1.5">
                            <CalendarClock className="h-4 w-4 text-purple-600" />
                            Smart Daily Batches (100 Emails / Day Quota)
                          </h3>
                          <p className="text-xs text-purple-700">
                            Split across {selectedCampaign.batches.length} days to protect your Resend daily limit.
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedBatch("all")}
                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                              selectedBatch === "all"
                                ? "bg-purple-600 text-white shadow-sm"
                                : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
                            }`}
                          >
                            All ({selectedCampaign.recipients.length})
                          </button>
                          {selectedCampaign.batches.map((b) => (
                            <button
                              key={b.batchNumber}
                              onClick={() => setSelectedBatch(b.batchNumber)}
                              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                                selectedBatch === b.batchNumber
                                  ? "bg-purple-600 text-white shadow-sm"
                                  : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
                              }`}
                            >
                              Batch {b.batchNumber} ({b.count})
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Batches Overview Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedCampaign.batches.map((b) => {
                          const isSent = b.status === "sent";
                          const isPending = b.status === "pending" || b.status === "scheduled";
                          return (
                            <div
                              key={b.batchNumber}
                              className={`p-3 rounded-lg border bg-white flex flex-col justify-between ${
                                selectedBatch === b.batchNumber ? "ring-2 ring-purple-500" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-semibold text-xs text-gray-900">
                                  Batch #{b.batchNumber} ({b.count} recipients)
                                </span>
                                <Badge
                                  variant={isSent ? "secondary" : "outline"}
                                  className={isSent ? "bg-green-100 text-green-800" : "bg-yellow-50 text-yellow-800 border-yellow-200"}
                                >
                                  {isSent ? "Sent" : b.status === "sending" ? "Sending..." : "Queued"}
                                </Badge>
                              </div>
                              <div className="text-[11px] text-gray-500 mb-2">
                                {isSent ? (
                                  <span>Sent: {fmt(b.sentAt || selectedCampaign.sentAt || selectedCampaign.createdAt)}</span>
                                ) : (
                                  <span>Scheduled: {fmt(b.scheduledFor || undefined)}</span>
                                )}
                              </div>
                              {isPending && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs h-7 border-purple-300 text-purple-700 hover:bg-purple-50"
                                  disabled={dispatchingBatch === b.batchNumber}
                                  onClick={() => handleDispatchBatch(selectedCampaign.id, b.batchNumber)}
                                >
                                  {dispatchingBatch === b.batchNumber ? (
                                    <span className="flex items-center gap-1">
                                      <LoaderCircle className="animate-spin h-3 w-3" />
                                      Dispatching...
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <Send className="h-3 w-3" />
                                      Send Batch {b.batchNumber} Now
                                    </span>
                                  )}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recipient table — searchable, filterable, sorted, paged */}
                  <RecipientTable
                    recipients={selectedCampaign.recipients.filter(
                      (r) => selectedBatch === "all" || (r.batchNumber || 1) === selectedBatch,
                    )}
                    showBatch={!!selectedCampaign.batches && selectedCampaign.batches.length > 1}
                    campaignSubject={selectedCampaign.subject}
                  />
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
      </main>
    </div>
  );
}
