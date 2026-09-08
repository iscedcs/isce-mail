"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Info,
  Layers,
  LoaderCircle,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

interface ConfirmSendDialogProps {
  open: boolean;
  onConfirm: () => void;
  onSchedule: (scheduledFor: string) => void;
  onCancel: () => void;
  recipientCount: number;
  subject: string;
  basis: string;
  isPending: boolean;
}

export default function ConfirmSendDialog({
  open,
  onConfirm,
  onSchedule,
  onCancel,
  recipientCount,
  subject,
  basis,
  isPending,
}: ConfirmSendDialogProps) {
  const [mode, setMode] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  const scheduledFor =
    mode === "later" && scheduledDate && scheduledTime
      ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      : null;

  const canSubmit =
    !isPending && (mode === "now" || (!!scheduledDate && !!scheduledTime));

  const handleSubmit = () => {
    if (mode === "now") {
      onConfirm();
    } else if (scheduledFor) {
      onSchedule(scheduledFor);
    }
  };

  const handleCancel = () => {
    setMode("now");
    setScheduledDate("");
    setScheduledTime("");
    onCancel();
  };

  // Batch breakdown calculations
  const batchSize = 100;
  const isMultiBatch = recipientCount > batchSize;
  const totalBatches = Math.max(1, Math.ceil(recipientCount / batchSize));

  const batches = Array.from({ length: totalBatches }, (_, i) => {
    const isLast = i === totalBatches - 1;
    const count = isLast ? recipientCount - i * batchSize : batchSize;
    let timingLabel = "";
    if (i === 0) {
      timingLabel = mode === "later" ? "On scheduled date" : "Dispatches now";
    } else if (i === 1) {
      timingLabel = "+24h (Day 2)";
    } else if (i === 2) {
      timingLabel = "+48h (Day 3)";
    } else {
      timingLabel = `+${i * 24}h (Day ${i + 1})`;
    }
    return {
      index: i + 1,
      count,
      timingLabel,
      isImmediate: i === 0,
    };
  });

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden border border-slate-200/90 shadow-2xl rounded-2xl bg-white">
        {/* Header with decorative badge */}
        <AlertDialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex flex-row items-start justify-between gap-4 space-y-0 text-left">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <AlertDialogTitle className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Review & Dispatch Campaign
              </AlertDialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify audience volume, batch limits, and delivery schedule.
              </p>
            </div>
          </div>

          {isMultiBatch ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 shrink-0">
              <Sparkles className="w-3 h-3 text-purple-600" />
              Smart Batching
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Direct Send
            </span>
          )}
        </AlertDialogHeader>

        {/* Content Body */}
        <AlertDialogDescription asChild>
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Campaign Summary Card */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  Subject Line
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                  {subject ? (
                    subject
                  ) : (
                    <span className="italic text-slate-400 font-normal">
                      (No subject specified)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-200/60">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="font-bold text-slate-900">
                    {recipientCount.toLocaleString()}
                  </span>
                  <span>recipient{recipientCount !== 1 ? "s" : ""}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Brand:</span>
                  <span className="font-semibold text-slate-900">
                    {basis || "Default"}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Quota:</span>
                  <span className="font-semibold text-emerald-700">
                    100/day limit
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Multi-Day Batch Roadmap (if > 100 recipients) */}
            {isMultiBatch ? (
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 via-purple-50/20 to-white p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-indigo-600 text-white shadow-2xs">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-indigo-950">
                      Smart Batching Active ({totalBatches} Daily Batches)
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/90 px-2 py-0.5 rounded-full">
                    100 emails/day limit
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Your audience of <strong>{recipientCount}</strong> exceeds the 100/day plan limit.
                  Deliveries are split automatically into consecutive daily batches to protect your domain reputation:
                </p>

                {/* Batch Cards Grid */}
                <div
                  className={`grid gap-2.5 ${
                    totalBatches === 2
                      ? "grid-cols-2"
                      : totalBatches === 3
                      ? "grid-cols-3"
                      : "grid-cols-2 sm:grid-cols-4"
                  }`}
                >
                  {batches.map((b) => (
                    <div
                      key={b.index}
                      className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
                        b.isImmediate
                          ? "bg-white border-emerald-300 shadow-xs ring-1 ring-emerald-200/50"
                          : "bg-white/90 border-slate-200 shadow-2xs hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800">
                          Batch {b.index}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            b.isImmediate
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {b.isImmediate
                            ? mode === "later"
                              ? "Start"
                              : "Today"
                            : `Day ${b.index}`}
                        </span>
                      </div>

                      <div className="my-2">
                        <div className="text-xl font-extrabold text-slate-900 tracking-tight">
                          {b.count}
                        </div>
                        <div className="text-[10px] uppercase font-semibold text-slate-400">
                          emails
                        </div>
                      </div>

                      <div
                        className={`text-[10px] font-medium flex items-center gap-1 pt-1.5 border-t ${
                          b.isImmediate
                            ? "border-emerald-100 text-emerald-700"
                            : "border-slate-100 text-slate-500"
                        }`}
                      >
                        {b.isImmediate ? (
                          <>
                            <Zap className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">
                              {mode === "later" ? "Scheduled" : "Send Now"}
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="truncate">{b.timingLabel}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>
                    Remaining batches queue automatically in database. You can inspect or trigger them early in <strong>Campaigns & Insights</strong>.
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-950">
                    Within Daily Quota Limit
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    All {recipientCount} emails fit inside your daily 100-email threshold and will be delivered in a single dispatch.
                  </p>
                </div>
              </div>
            )}

            {/* Delivery Timing - Segmented Pill Control */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                Delivery Timing
              </label>
              <div className="p-1 bg-slate-100/90 rounded-xl flex items-center gap-1 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setMode("now")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    mode === "now"
                      ? "bg-white text-indigo-700 shadow-xs ring-1 ring-slate-900/5 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Immediately</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("later")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    mode === "later"
                      ? "bg-white text-indigo-700 shadow-xs ring-1 ring-slate-900/5 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Schedule Future Date</span>
                </button>
              </div>
            </div>

            {/* Scheduled date & time inputs (when mode === 'later') */}
            {mode === "later" && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3 animate-in fade-in-50 duration-150">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Start Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none bg-white text-slate-900 shadow-xs"
                      value={scheduledDate}
                      min={todayStr}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Start Time <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none bg-white text-slate-900 shadow-xs"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>
                {scheduledDate && scheduledTime && (
                  <div className="flex items-center gap-2 text-xs text-indigo-800 bg-white/90 border border-indigo-100 rounded-lg px-3 py-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>
                      Batch 1 will dispatch on{" "}
                      <strong>
                        {new Date(
                          `${scheduledDate}T${scheduledTime}`
                        ).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </strong>
                      {isMultiBatch && " · Next batches follow in 24-hour intervals."}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </AlertDialogDescription>

        {/* Footer actions */}
        <AlertDialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-row items-center justify-end gap-3 sm:space-x-0">
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={isPending}
            className="mt-0 h-10 px-4 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-xs font-semibold transition-colors"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-10 px-5 rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                {mode === "now" ? "Dispatching Batch 1..." : "Scheduling..."}
              </span>
            ) : mode === "now" ? (
              isMultiBatch ? (
                <span className="flex items-center gap-2">
                  <Send className="w-3.5 h-3.5" />
                  Dispatch Batch 1 (100) & Queue {recipientCount - 100}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-3.5 h-3.5" />
                  Send Now to {recipientCount} Recipient{recipientCount !== 1 ? "s" : ""}
                </span>
              )
            ) : (
              <span className="flex items-center gap-2">
                <CalendarClock className="w-3.5 h-3.5" />
                Schedule Campaign ({recipientCount} Recipients)
              </span>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
