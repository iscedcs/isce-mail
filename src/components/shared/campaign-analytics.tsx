"use client";

/**
 * campaign-analytics.tsx
 *
 * Per-campaign performance visuals for the history dashboard.
 *
 * Everything here is derived from the per-recipient timestamps that
 * `listCampaignsFromDb` already returns on `campaign.batches[].recipients[]`,
 * so there is no extra API call and no extra query.
 *
 * Why derived instead of reading `campaign.stats`: the stats counters are
 * incremented per webhook event, so `opened` can legitimately exceed
 * `delivered` (Resend sometimes reports an open without a prior delivered
 * event). A funnel whose stages don't monotonically decrease is a broken
 * funnel, so the stages are computed as nested sets instead — clicked ⊆ opened
 * ⊆ delivered ⊆ sent, by construction.
 *
 * Colors come from the validated data-viz palette:
 *   - funnel stages are ordered, so they use a single-hue ordinal blue ramp
 *   - opens/clicks are distinct series, so they use categorical slots 1 and 2
 *   - bounce/quarantine use reserved status colors, always with an icon + label
 * Both sets were checked with the palette validator against a white surface.
 * This dashboard renders light-only (no `dark:` classes anywhere on the page),
 * so only light values are defined.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, HelpCircle, TableIcon, BarChart3 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnalyticsRecipient = {
  email: string;
  name?: string;
  status?: string;
  resendEmailId?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  openedAt?: string | null;
  clickedAt?: string | null;
  bouncedAt?: string | null;
};

export type AnalyticsBatch = {
  batchNumber: number;
  count?: number;
  sentAt?: string | null;
  recipients?: AnalyticsRecipient[];
};

// ---------------------------------------------------------------------------
// Palette — validated against surface #ffffff (light)
// ---------------------------------------------------------------------------

const VIZ = {
  ink: "#0b0b0b",
  ink2: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  surface: "#ffffff",
  // categorical slots 1 & 2 — worst adjacent CVD ΔE 24.7, normal-vision ΔE 33.6
  opens: "#2a78d6",
  clicks: "#eb6834",
  // ordinal blue ramp — monotone L, light end 2.11:1 vs white
  funnel: ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab"],
  track: "#cde2fb",
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
} as const;

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

const ms = (d?: string | null) => (d ? new Date(d).getTime() : null);

function flattenRecipients(batches: AnalyticsBatch[]): AnalyticsRecipient[] {
  return batches.flatMap((b) => b.recipients ?? []);
}

type Funnel = {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  needsReview: number;
};

function deriveFunnel(rows: AnalyticsRecipient[]): Funnel {
  let sent = 0,
    delivered = 0,
    opened = 0,
    clicked = 0,
    bounced = 0,
    failed = 0,
    needsReview = 0;

  for (const r of rows) {
    const didClick = !!r.clickedAt;
    const didOpen = !!r.openedAt || didClick;
    // An open or click proves delivery even when the delivered webhook was
    // never received, so each stage subsumes the ones below it.
    const didDeliver = !!r.deliveredAt || didOpen;
    const didSend = !!r.resendEmailId || didDeliver;

    if (didSend) sent++;
    if (didDeliver) delivered++;
    if (didOpen) opened++;
    if (didClick) clicked++;
    if (r.bouncedAt) bounced++;
    if (r.status === "failed") failed++;
    if (r.status === "needs_review") needsReview++;
  }

  return { sent, delivered, opened, clicked, bounced, failed, needsReview };
}

type Series = { label: string; color: string; values: number[] };

type Timeline = {
  buckets: string[];
  series: Series[];
  bucketHours: number;
  max: number;
  total: { opens: number; clicks: number };
};

function deriveTimeline(rows: AnalyticsRecipient[]): Timeline | null {
  const sentTimes = rows.map((r) => ms(r.sentAt)).filter((v): v is number => v !== null);
  if (sentTimes.length === 0) return null;
  const anchor = Math.min(...sentTimes);

  const openTimes = rows.map((r) => ms(r.openedAt)).filter((v): v is number => v !== null);
  const clickTimes = rows.map((r) => ms(r.clickedAt)).filter((v): v is number => v !== null);
  if (openTimes.length === 0 && clickTimes.length === 0) return null;

  const last = Math.max(...openTimes, ...clickTimes, anchor);
  const spanHours = (last - anchor) / 3_600_000;

  // Hourly reads well for the first couple of days; past that it becomes noise.
  const bucketHours = spanHours <= 48 ? 1 : 24;
  const minBuckets = bucketHours === 1 ? 6 : 3;
  const count = Math.max(minBuckets, Math.ceil(spanHours / bucketHours) + 1);

  const opens = new Array(count).fill(0);
  const clicks = new Array(count).fill(0);

  const place = (arr: number[], t: number) => {
    const idx = Math.floor(Math.max(0, t - anchor) / (bucketHours * 3_600_000));
    if (idx >= 0 && idx < arr.length) arr[idx]++;
  };
  openTimes.forEach((t) => place(opens, t));
  clickTimes.forEach((t) => place(clicks, t));

  const buckets = Array.from({ length: count }, (_, i) =>
    bucketHours === 1 ? `+${i}h` : `+${i}d`,
  );

  return {
    buckets,
    bucketHours,
    series: [
      { label: "Opens", color: VIZ.opens, values: opens },
      { label: "Clicks", color: VIZ.clicks, values: clicks },
    ],
    max: Math.max(1, ...opens, ...clicks),
    total: { opens: openTimes.length, clicks: clickTimes.length },
  };
}

const rate = (n: number, d: number) => (d > 0 ? n / d : 0);
const asPct = (v: number) => `${(v * 100).toFixed(v >= 0.1 ? 0 : 1)}%`;

// ---------------------------------------------------------------------------
// Delivery funnel — ordered stages, ordinal ramp, HTML bars
// ---------------------------------------------------------------------------

function DeliveryFunnel({ f }: { f: Funnel }) {
  const stages = [
    { key: "sent", label: "Sent", value: f.sent, color: VIZ.funnel[0], dropLabel: "" },
    {
      key: "delivered",
      label: "Delivered",
      value: f.delivered,
      color: VIZ.funnel[1],
      dropLabel: "not confirmed delivered",
    },
    {
      key: "opened",
      label: "Opened",
      value: f.opened,
      color: VIZ.funnel[2],
      dropLabel: "never opened",
    },
    {
      key: "clicked",
      label: "Clicked",
      value: f.clicked,
      color: VIZ.funnel[3],
      dropLabel: "opened without clicking",
    },
  ];
  const top = Math.max(1, f.sent);

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: VIZ.ink2 }}>
        Delivery funnel
      </h4>
      <p className="text-[11px] mt-0.5 mb-3" style={{ color: VIZ.muted }}>
        Each stage counts recipients who reached at least that far.
      </p>

      <div className="space-y-2">
        {stages.map((s, i) => {
          const prev = i === 0 ? null : stages[i - 1].value;
          const dropped = prev === null ? 0 : prev - s.value;
          const widthPct = Math.max((s.value / top) * 100, s.value > 0 ? 1.5 : 0);

          return (
            <div key={s.key}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: VIZ.ink }}>
                  {s.label}
                </span>
                <span className="text-xs" style={{ color: VIZ.ink2 }}>
                  <span className="font-semibold tabular-nums" style={{ color: VIZ.ink }}>
                    {s.value.toLocaleString()}
                  </span>
                  {i > 0 && (
                    <span style={{ color: VIZ.muted }}> · {asPct(rate(s.value, top))} of sent</span>
                  )}
                </span>
              </div>

              {/* Track is a lighter step of the same ramp so the shortfall reads
                  as "the rest of the bar", not as empty space. */}
              <div
                className="relative h-5 w-full rounded-sm overflow-hidden"
                style={{ backgroundColor: VIZ.track }}
                role="img"
                aria-label={`${s.label}: ${s.value} of ${top} sent`}
              >
                <div
                  className="h-full rounded-r-[4px] transition-[width] duration-500 ease-out"
                  style={{ width: `${widthPct}%`, backgroundColor: s.color }}
                />
              </div>

              {prev !== null && dropped > 0 && (
                <p className="text-[11px] mt-1" style={{ color: VIZ.muted }}>
                  −{dropped.toLocaleString()} {s.dropLabel}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rate meters
// ---------------------------------------------------------------------------

function Meter({
  label,
  value,
  caption,
  color,
  track,
}: {
  label: string;
  value: number;
  caption: string;
  color: string;
  track: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium" style={{ color: VIZ.ink }}>
          {label}
        </span>
        <span className="text-sm font-semibold" style={{ color: VIZ.ink }}>
          {asPct(value)}
        </span>
      </div>
      <div
        className="h-1.5 w-full rounded-full mt-1.5 overflow-hidden"
        style={{ backgroundColor: track }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(100, value * 100)}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-[11px] mt-1" style={{ color: VIZ.muted }}>
        {caption}
      </p>
    </div>
  );
}

function RatePanel({ f }: { f: Funnel }) {
  const openRate = rate(f.opened, f.sent);
  const clickRate = rate(f.clicked, f.sent);
  const ctor = rate(f.clicked, f.opened);
  const bounceRate = rate(f.bounced, f.sent);

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: VIZ.ink2 }}>
        Engagement rates
      </h4>
      <Meter
        label="Open rate"
        value={openRate}
        caption={`${f.opened.toLocaleString()} of ${f.sent.toLocaleString()} sent`}
        color={VIZ.opens}
        track={VIZ.track}
      />
      <Meter
        label="Click rate"
        value={clickRate}
        caption={`${f.clicked.toLocaleString()} of ${f.sent.toLocaleString()} sent`}
        color={VIZ.clicks}
        track="#fbdfd3"
      />
      <Meter
        label="Click-to-open"
        value={ctor}
        caption="Share of openers who clicked through"
        color={VIZ.funnel[3]}
        track={VIZ.track}
      />
      <Meter
        label="Bounce rate"
        value={bounceRate}
        caption={
          bounceRate > 0.02
            ? "Above 2% — worth pruning the list"
            : `${f.bounced.toLocaleString()} hard bounces`
        }
        color={bounceRate > 0.02 ? VIZ.critical : VIZ.good}
        track="#eceae4"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Engagement timeline — SVG, measured width so strokes and text stay true
// ---------------------------------------------------------------------------

function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(w);
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  return [ref, width] as const;
}

function EngagementTimeline({ t }: { t: Timeline }) {
  const [wrapRef, width] = useMeasuredWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const PAD = { top: 16, right: 16, bottom: 26, left: 36 };
  const H = 180;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = H - PAD.top - PAD.bottom;

  const n = t.buckets.length;

  // Round the domain up to a clean number FIRST, then scale to it — otherwise
  // the top gridline sits at `max` while its label reads the rounded value.
  const domainMax = (() => {
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(1, t.max))));
    return Math.max(1, Math.ceil(t.max / mag) * mag);
  })();

  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / domainMax) * plotH;

  const linePath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const areaPath = (values: number[]) =>
    `${linePath(values)} L${x(n - 1).toFixed(1)},${(PAD.top + plotH).toFixed(1)} L${x(0).toFixed(1)},${(
      PAD.top + plotH
    ).toFixed(1)} Z`;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (plotW <= 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    const rel = e.clientX - box.left - PAD.left;
    const idx = Math.round((rel / plotW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, idx)));
  };

  const onKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setHover((h) => {
      const base = h ?? 0;
      return Math.min(n - 1, Math.max(0, base + (e.key === "ArrowRight" ? 1 : -1)));
    });
  };

  const peakIdx = t.series[0].values.indexOf(Math.max(...t.series[0].values));

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: VIZ.ink2 }}>
          Engagement over time
        </h4>
        {/* Legend is always present for two or more series. */}
        <div className="flex items-center gap-3">
          {t.series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: VIZ.ink2 }}>
              <span
                className="inline-block rounded-full"
                style={{ width: 8, height: 8, backgroundColor: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <p className="text-[11px] mb-2" style={{ color: VIZ.muted }}>
        {t.bucketHours === 1 ? "Per hour" : "Per day"} since dispatch · {t.total.opens.toLocaleString()} opens,{" "}
        {t.total.clicks.toLocaleString()} clicks
      </p>

      <div ref={wrapRef} className="relative w-full">
        {width > 0 && (
          <svg
            width={width}
            height={H}
            role="img"
            tabIndex={0}
            aria-label={`Opens and clicks per ${t.bucketHours === 1 ? "hour" : "day"} since dispatch`}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            onKeyDown={onKey}
            className="outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
          >
            {/* Recessive hairline grid — solid, never dashed */}
            {[0, 0.5, 1].map((frac) => (
              <line
                key={frac}
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={PAD.top + plotH * frac}
                y2={PAD.top + plotH * frac}
                stroke={frac === 1 ? VIZ.axis : VIZ.grid}
                strokeWidth={1}
              />
            ))}
            {[0, domainMax].map((v, i) => (
              <text
                key={v}
                x={PAD.left - 6}
                y={i === 0 ? PAD.top + plotH + 4 : PAD.top + 4}
                textAnchor="end"
                fontSize={10}
                fill={VIZ.muted}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {v}
              </text>
            ))}

            {t.series.map((s) => (
              <g key={s.label}>
                <path d={areaPath(s.values)} fill={s.color} opacity={0.1} />
                <path
                  d={linePath(s.values)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            ))}

            {/* Selective direct label: the peak of the primary series only. */}
            {peakIdx >= 0 && t.series[0].values[peakIdx] > 0 && hover === null && (
              <>
                <circle
                  cx={x(peakIdx)}
                  cy={y(t.series[0].values[peakIdx])}
                  r={4}
                  fill={VIZ.opens}
                  stroke={VIZ.surface}
                  strokeWidth={2}
                />
                <text
                  x={Math.min(Math.max(x(peakIdx), PAD.left + 10), PAD.left + plotW - 10)}
                  y={Math.max(y(t.series[0].values[peakIdx]) - 9, PAD.top + 8)}
                  textAnchor={
                    peakIdx === 0 ? "start" : peakIdx === n - 1 ? "end" : "middle"
                  }
                  fontSize={10}
                  fontWeight={600}
                  fill={VIZ.ink}
                >
                  {t.series[0].values[peakIdx]}
                </text>
              </>
            )}

            {hover !== null && (
              <>
                <line
                  x1={x(hover)}
                  x2={x(hover)}
                  y1={PAD.top}
                  y2={PAD.top + plotH}
                  stroke={VIZ.axis}
                  strokeWidth={1}
                />
                {t.series.map((s) => (
                  <circle
                    key={s.label}
                    cx={x(hover)}
                    cy={y(s.values[hover])}
                    r={4}
                    fill={s.color}
                    stroke={VIZ.surface}
                    strokeWidth={2}
                  />
                ))}
              </>
            )}

            {/* x labels: first, middle, last only — never one per point */}
            {[0, Math.floor((n - 1) / 2), n - 1]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((i) => (
                <text
                  key={i}
                  x={x(i)}
                  y={H - 8}
                  textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                  fontSize={10}
                  fill={VIZ.muted}
                >
                  {t.buckets[i]}
                </text>
              ))}
          </svg>
        )}

        {hover !== null && width > 0 && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border bg-white px-2.5 py-1.5 shadow-sm"
            style={{
              borderColor: "rgba(11,11,11,0.10)",
              left: Math.min(Math.max(x(hover) - 55, 0), Math.max(0, width - 110)),
              top: 0,
              width: 110,
            }}
          >
            <p className="text-[10px] font-medium" style={{ color: VIZ.muted }}>
              {t.buckets[hover]} after send
            </p>
            {t.series.map((s) => (
              <p key={s.label} className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1" style={{ color: VIZ.ink2 }}>
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 6, height: 6, backgroundColor: s.color }}
                  />
                  {s.label}
                </span>
                <span className="font-semibold tabular-nums" style={{ color: VIZ.ink }}>
                  {s.values[hover]}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-batch comparison
// ---------------------------------------------------------------------------

function BatchPerformance({ batches }: { batches: AnalyticsBatch[] }) {
  const rows = batches
    .map((b) => {
      const f = deriveFunnel(b.recipients ?? []);
      return { batchNumber: b.batchNumber, f };
    })
    .filter((r) => r.f.sent > 0);

  if (rows.length < 2) return null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: VIZ.ink2 }}>
          Per-batch performance
        </h4>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: VIZ.ink2 }}>
            <span className="inline-block rounded-full" style={{ width: 8, height: 8, backgroundColor: VIZ.opens }} />
            Open rate
          </span>
          <span className="flex items-center gap-1.5 text-[11px]" style={{ color: VIZ.ink2 }}>
            <span className="inline-block rounded-full" style={{ width: 8, height: 8, backgroundColor: VIZ.clicks }} />
            Click rate
          </span>
        </div>
      </div>
      <p className="text-[11px] mb-3" style={{ color: VIZ.muted }}>
        Rates are against delivered, so a smaller batch is still comparable.
      </p>

      <div className="space-y-3">
        {rows.map(({ batchNumber, f }) => {
          const open = rate(f.opened, f.delivered);
          const click = rate(f.clicked, f.delivered);
          return (
            <div key={batchNumber} className="flex items-center gap-3">
              <span
                className="w-16 shrink-0 text-[11px] font-medium"
                style={{ color: VIZ.ink2 }}
              >
                Batch {batchNumber}
              </span>
              <div className="flex-1 space-y-[2px]">
                {/* 2px surface gap between the two bars, never a stroke. */}
                <div className="h-2.5 w-full rounded-sm" style={{ backgroundColor: VIZ.track }}>
                  <div
                    className="h-full rounded-r-[4px]"
                    style={{ width: `${Math.max(open * 100, open > 0 ? 1 : 0)}%`, backgroundColor: VIZ.opens }}
                    title={`Batch ${batchNumber} open rate ${asPct(open)}`}
                  />
                </div>
                <div className="h-2.5 w-full rounded-sm" style={{ backgroundColor: "#fbdfd3" }}>
                  <div
                    className="h-full rounded-r-[4px]"
                    style={{ width: `${Math.max(click * 100, click > 0 ? 1 : 0)}%`, backgroundColor: VIZ.clicks }}
                    title={`Batch ${batchNumber} click rate ${asPct(click)}`}
                  />
                </div>
              </div>
              <span
                className="w-24 shrink-0 text-right text-[11px] tabular-nums"
                style={{ color: VIZ.ink2 }}
              >
                {asPct(open)} · {asPct(click)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Health strip — status colors always carry an icon + label
// ---------------------------------------------------------------------------

function HealthStrip({ f }: { f: Funnel }) {
  const items = [
    f.bounced > 0 && {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      color: VIZ.critical,
      label: `${f.bounced} bounced`,
      hint: "These contacts are suppressed from future sends.",
    },
    f.failed > 0 && {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      color: VIZ.warning,
      label: `${f.failed} failed`,
      hint: "Resend rejected these addresses. Retry from the batch menu.",
    },
    f.needsReview > 0 && {
      icon: <HelpCircle className="h-3.5 w-3.5" />,
      color: VIZ.warning,
      label: `${f.needsReview} need review`,
      hint: "Dispatch outcome unknown — not re-sent automatically to avoid a duplicate.",
    },
  ].filter(Boolean) as { icon: React.ReactNode; color: string; label: string; hint: string }[];

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <span
          key={it.label}
          title={it.hint}
          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium"
          style={{ color: it.color, borderColor: "rgba(11,11,11,0.10)" }}
        >
          {it.icon}
          <span style={{ color: VIZ.ink2 }}>{it.label}</span>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table view — the WCAG-clean twin of every chart above
// ---------------------------------------------------------------------------

function AnalyticsTable({ f, t, batches }: { f: Funnel; t: Timeline | null; batches: AnalyticsBatch[] }) {
  const cell = "px-3 py-1.5 text-xs";
  const batchRows = batches
    .map((b) => ({ batchNumber: b.batchNumber, f: deriveFunnel(b.recipients ?? []) }))
    .filter((r) => r.f.sent > 0);

  return (
    <div className="space-y-5">
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: VIZ.ink2 }}>
          Delivery funnel
        </h4>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ color: VIZ.muted }}>
              <th className={`${cell} text-left font-medium`}>Stage</th>
              <th className={`${cell} text-right font-medium`}>Recipients</th>
              <th className={`${cell} text-right font-medium`}>% of sent</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Sent", f.sent],
              ["Delivered", f.delivered],
              ["Opened", f.opened],
              ["Clicked", f.clicked],
              ["Bounced", f.bounced],
            ].map(([label, v]) => (
              <tr key={label as string} className="border-t" style={{ borderColor: VIZ.grid }}>
                <td className={cell} style={{ color: VIZ.ink }}>
                  {label}
                </td>
                <td className={`${cell} text-right tabular-nums`} style={{ color: VIZ.ink }}>
                  {(v as number).toLocaleString()}
                </td>
                <td className={`${cell} text-right tabular-nums`} style={{ color: VIZ.ink2 }}>
                  {asPct(rate(v as number, f.sent))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {batchRows.length > 1 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: VIZ.ink2 }}>
            Per-batch performance
          </h4>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ color: VIZ.muted }}>
                <th className={`${cell} text-left font-medium`}>Batch</th>
                <th className={`${cell} text-right font-medium`}>Delivered</th>
                <th className={`${cell} text-right font-medium`}>Open rate</th>
                <th className={`${cell} text-right font-medium`}>Click rate</th>
              </tr>
            </thead>
            <tbody>
              {batchRows.map(({ batchNumber, f: bf }) => (
                <tr key={batchNumber} className="border-t" style={{ borderColor: VIZ.grid }}>
                  <td className={cell} style={{ color: VIZ.ink }}>
                    Batch {batchNumber}
                  </td>
                  <td className={`${cell} text-right tabular-nums`} style={{ color: VIZ.ink }}>
                    {bf.delivered.toLocaleString()}
                  </td>
                  <td className={`${cell} text-right tabular-nums`} style={{ color: VIZ.ink2 }}>
                    {asPct(rate(bf.opened, bf.delivered))}
                  </td>
                  <td className={`${cell} text-right tabular-nums`} style={{ color: VIZ.ink2 }}>
                    {asPct(rate(bf.clicked, bf.delivered))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {t && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: VIZ.ink2 }}>
            Engagement over time
          </h4>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ color: VIZ.muted }}>
                <th className={`${cell} text-left font-medium`}>
                  {t.bucketHours === 1 ? "Hour" : "Day"} after send
                </th>
                <th className={`${cell} text-right font-medium`}>Opens</th>
                <th className={`${cell} text-right font-medium`}>Clicks</th>
              </tr>
            </thead>
            <tbody>
              {t.buckets.map((b, i) => (
                <tr key={b} className="border-t" style={{ borderColor: VIZ.grid }}>
                  <td className={cell} style={{ color: VIZ.ink }}>
                    {b}
                  </td>
                  <td className={`${cell} text-right tabular-nums`} style={{ color: VIZ.ink }}>
                    {t.series[0].values[i]}
                  </td>
                  <td className={`${cell} text-right tabular-nums`} style={{ color: VIZ.ink }}>
                    {t.series[1].values[i]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function CampaignAnalytics({ batches }: { batches: AnalyticsBatch[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");

  const rows = useMemo(() => flattenRecipients(batches), [batches]);
  const funnel = useMemo(() => deriveFunnel(rows), [rows]);
  const timeline = useMemo(() => deriveTimeline(rows), [rows]);

  if (rows.length === 0) return null;

  return (
    <section className="rounded-xl border bg-white p-4 sm:p-5" style={{ borderColor: "rgba(11,11,11,0.10)" }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold" style={{ color: VIZ.ink }}>
          Campaign performance
        </h3>
        <div className="flex items-center gap-1 rounded-lg border p-0.5" style={{ borderColor: VIZ.grid }}>
          {(
            [
              ["chart", "Chart", <BarChart3 key="c" className="h-3.5 w-3.5" />],
              ["table", "Table", <TableIcon key="t" className="h-3.5 w-3.5" />],
            ] as const
          ).map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                view === key ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <AnalyticsTable f={funnel} t={timeline} batches={batches} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-5">
            <div className="sm:col-span-3">
              <DeliveryFunnel f={funnel} />
            </div>
            <div className="sm:col-span-2">
              <RatePanel f={funnel} />
            </div>
          </div>

    <HealthStrip f={funnel} />

          {funnel.sent > 0 && funnel.delivered / funnel.sent < 0.9 && (
            <p
              className="rounded-lg border px-3 py-2 text-[11px]"
              style={{ borderColor: "rgba(11,11,11,0.10)", color: VIZ.ink2 }}
            >
              <span className="font-medium" style={{ color: VIZ.ink }}>
                Partial delivery confirmations.
              </span>{" "}
              Only {asPct(rate(funnel.delivered, funnel.sent))} of sent emails have a
              matched delivered event, so the funnel&apos;s Delivered stage understates
              reality. Rates above are measured against sent, which is always exact.
            </p>
          )}

          {timeline ? (
            <EngagementTimeline t={timeline} />
          ) : (
            <p
              className="rounded-lg border border-dashed px-3 py-6 text-center text-xs"
              style={{ borderColor: VIZ.grid, color: VIZ.muted }}
            >
              No opens or clicks recorded yet. Engagement appears here as Resend
              webhooks arrive.
            </p>
          )}

          <BatchPerformance batches={batches} />
        </div>
      )}
    </section>
  );
}

export { deriveFunnel, deriveTimeline };
export type { Funnel, Timeline };
