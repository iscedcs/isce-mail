"use client";

/**
 * recipient-table.tsx
 *
 * The per-campaign recipient list. Replaces the inline table that rendered every
 * recipient in one unpaginated pass — unusable at 200+ rows, and with no way to
 * answer "who bounced?" or "did this person open it?" without scrolling.
 *
 * Filtering, sorting and paging are all client-side: the campaign payload
 * already contains every recipient, so a round-trip per page would be slower
 * than filtering in place.
 */

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
  Eye,
  MousePointerClick,
  Search,
  XCircle,
} from "lucide-react";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TableRecipient = {
  email: string;
  firstname?: string;
  status?: string;
  batchNumber?: number;
  events: {
    delivered?: string;
    opened?: string;
    clicked?: string;
    bounced?: string;
    bounceReason?: string;
  };
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  scheduled: "bg-purple-100 text-purple-800",
  sending: "bg-blue-100 text-blue-800",
  sent: "bg-gray-100 text-gray-700",
  delivered: "bg-green-100 text-green-800",
  opened: "bg-blue-100 text-blue-800",
  clicked: "bg-indigo-100 text-indigo-800",
  bounced: "bg-red-100 text-red-800",
  suppressed: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800",
  needs_review: "bg-amber-100 text-amber-800",
  cancelled: "bg-gray-100 text-gray-500",
};

type SortKey = "email" | "status" | "delivered" | "opened" | "clicked" | "bounced";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [25, 50, 100, 250];

const effectiveStatus = (r: TableRecipient) =>
  r.status || (r.events.delivered ? "delivered" : "sent");

const time = (iso?: string) => (iso ? new Date(iso).getTime() : 0);

function fmtTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecipientTable({
  recipients,
  showBatch,
  campaignSubject,
}: {
  recipients: TableRecipient[];
  showBatch: boolean;
  campaignSubject?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [engagement, setEngagement] = useState<"all" | "opened" | "clicked" | "unopened">("all");
  const [sortKey, setSortKey] = useState<SortKey>("email");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  // Status chips are built from the data so they always match what's present,
  // and each carries its count — the filter doubles as a summary.
  const statusCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of recipients) {
      const s = effectiveStatus(r);
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [recipients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipients.filter((r) => {
      if (q && !`${r.email} ${r.firstname ?? ""}`.toLowerCase().includes(q)) return false;
      if (status !== "all" && effectiveStatus(r) !== status) return false;
      if (engagement === "opened" && !r.events.opened && !r.events.clicked) return false;
      if (engagement === "clicked" && !r.events.clicked) return false;
      if (engagement === "unopened" && (r.events.opened || r.events.clicked)) return false;
      return true;
    });
  }, [recipients, query, status, engagement]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "email":
          return a.email.localeCompare(b.email) * dir;
        case "status":
          return effectiveStatus(a).localeCompare(effectiveStatus(b)) * dir;
        default:
          return (time(a.events[sortKey]) - time(b.events[sortKey])) * dir;
      }
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Any change to the result set should land the reader on page 1, not on a
  // page number that no longer exists.
  useEffect(() => {
    setPage(1);
  }, [query, status, engagement, pageSize]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Timestamps are most useful newest-first; names read A→Z.
      setSortDir(key === "email" || key === "status" ? "asc" : "desc");
    }
  };

  const exportCsv = () => {
    const head = ["Email", "Name", "Batch", "Status", "Delivered", "Opened", "Clicked", "Bounced", "Bounce reason"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = sorted.map((r) =>
      [
        r.email,
        r.firstname ?? "",
        String(r.batchNumber ?? 1),
        effectiveStatus(r),
        r.events.delivered ?? "",
        r.events.opened ?? "",
        r.events.clicked ?? "",
        r.events.bounced ?? "",
        r.events.bounceReason ?? "",
      ]
        .map(esc)
        .join(","),
    );
    const blob = new Blob([[head.map(esc).join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(campaignSubject || "campaign").replace(/[^a-z0-9]+/gi, "-").slice(0, 60).toLowerCase()}-recipients.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortHead = ({ label, k }: { label: string; k: SortKey }) => (
    <TableHead>
      <button
        onClick={() => toggleSort(k)}
        className="flex items-center gap-1 hover:text-gray-900 transition-colors"
        aria-label={`Sort by ${label}`}
      >
        {label}
        {sortKey === k ? (
          <span className="text-[10px] font-bold text-gray-700">{sortDir === "asc" ? "↑" : "↓"}</span>
        ) : (
          <ChevronsUpDown className="h-3 w-3 text-gray-300" />
        )}
      </button>
    </TableHead>
  );

  const EventCell = ({
    iso,
    icon,
    className,
  }: {
    iso?: string;
    icon: React.ReactNode;
    className: string;
  }) =>
    iso ? (
      <span className={`text-xs font-medium flex items-center gap-1 ${className}`}>
        {icon}
        {fmtTime(iso)}
      </span>
    ) : (
      <span className="text-xs text-gray-300">—</span>
    );

  const colCount = showBatch ? 8 : 7;

  return (
    <div className="space-y-3">
      {/* One filter row above everything it scopes */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search email or name…"
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-gray-400"
          />
        </div>

        <select
          value={engagement}
          onChange={(e) => setEngagement(e.target.value as typeof engagement)}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-gray-400"
        >
          <option value="all">All engagement</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="unopened">Not opened</option>
        </select>

        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-gray-400"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>

        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Status chips double as the filter and the breakdown */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setStatus("all")}
          aria-pressed={status === "all"}
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
            status === "all"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All {recipients.length}
        </button>
        {statusCounts.map(([s, n]) => (
          <button
            key={s}
            onClick={() => setStatus(s === status ? "all" : s)}
            aria-pressed={status === s}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
              status === s
                ? "ring-2 ring-gray-900 ring-offset-1 " + (STATUS_COLOR[s] ?? "bg-gray-100 text-gray-700")
                : (STATUS_COLOR[s] ?? "bg-gray-100 text-gray-700") + " hover:opacity-80"
            }`}
          >
            {s.replace(/_/g, " ")} {n}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="Email" k="email" />
              <TableHead>Name</TableHead>
              {showBatch && <TableHead>Batch</TableHead>}
              <SortHead label="Status" k="status" />
              <SortHead label="Delivered" k="delivered" />
              <SortHead label="Opened" k="opened" />
              <SortHead label="Clicked" k="clicked" />
              <SortHead label="Bounced" k="bounced" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="py-10 text-center text-sm text-gray-400">
                  No recipients match these filters.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r) => {
                const s = effectiveStatus(r);
                return (
                  <TableRow key={r.email} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-xs">{r.email}</TableCell>
                    <TableCell className="text-sm">{r.firstname || ""}</TableCell>
                    {showBatch && (
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          #{r.batchNumber || 1}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          STATUS_COLOR[s] ?? "bg-gray-100"
                        }`}
                      >
                        {s.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <EventCell
                        iso={r.events.delivered}
                        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        className="text-green-700"
                      />
                    </TableCell>
                    <TableCell>
                      <EventCell
                        iso={r.events.opened}
                        icon={<Eye className="h-3.5 w-3.5" />}
                        className="text-blue-700"
                      />
                    </TableCell>
                    <TableCell>
                      <EventCell
                        iso={r.events.clicked}
                        icon={<MousePointerClick className="h-3.5 w-3.5" />}
                        className="text-purple-700"
                      />
                    </TableCell>
                    <TableCell>
                      {r.events.bounced ? (
                        <div>
                          <span className="text-xs text-red-700 font-medium flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" />
                            {fmtTime(r.events.bounced)}
                          </span>
                          {r.events.bounceReason && (
                            <p className="text-[11px] text-red-600 mt-0.5 max-w-[180px]">
                              {r.events.bounceReason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          {sorted.length === recipients.length ? (
            <>
              {sorted.length.toLocaleString()} recipient{sorted.length === 1 ? "" : "s"}
            </>
          ) : (
            <>
              {sorted.length.toLocaleString()} of {recipients.length.toLocaleString()} recipients
            </>
          )}
          {sorted.length > 0 && (
            <>
              {" · "}showing {((safePage - 1) * pageSize + 1).toLocaleString()}–
              {Math.min(safePage * pageSize, sorted.length).toLocaleString()}
            </>
          )}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 text-xs text-gray-600 tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
