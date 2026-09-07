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
import { CalendarClock, LoaderCircle, Send } from "lucide-react";

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

  // Reset mode when dialog reopens
  const handleCancel = () => {
    setMode("now");
    setScheduledDate("");
    setScheduledTime("");
    onCancel();
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Send email campaign</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm text-muted-foreground">
              {/* Campaign summary */}
              <ul className="rounded-md border bg-muted/40 p-3 space-y-1">
                <li>
                  <span className="font-medium text-foreground">To: </span>
                  {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
                </li>
                <li>
                  <span className="font-medium text-foreground">Subject: </span>
                  {subject || <em className="opacity-60">No subject</em>}
                </li>
                <li>
                  <span className="font-medium text-foreground">Brand: </span>
                  {basis}
                </li>
              </ul>

              {/* Send now / schedule toggle */}
              <div>
                <p className="text-xs font-medium text-foreground mb-2">
                  When to send
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("now")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      mode === "now"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("later")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      mode === "later"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
                    }`}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    Schedule
                  </button>
                </div>
              </div>

              {/* Date / time picker */}
              {mode === "later" && (
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-purple-50 border border-purple-100 p-3">
                  <div>
                    <label className="block text-xs font-medium text-purple-800 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      className="w-full border border-purple-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none bg-white text-gray-900"
                      value={scheduledDate}
                      min={todayStr}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-800 mb-1">
                      Time *
                    </label>
                    <input
                      type="time"
                      className="w-full border border-purple-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none bg-white text-gray-900"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                  {scheduledDate && scheduledTime && (
                    <p className="col-span-2 text-xs text-purple-700 font-medium">
                      Will send at:{" "}
                      {new Date(
                        `${scheduledDate}T${scheduledTime}`,
                      ).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {mode === "now" && (
                <p className="text-xs text-amber-600">
                  This action cannot be undone. Emails will be delivered
                  immediately.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? (
              <span className="flex items-center gap-2">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                {mode === "now" ? "Sending..." : "Scheduling..."}
              </span>
            ) : mode === "now" ? (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Send to {recipientCount} recipient
                {recipientCount !== 1 ? "s" : ""}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4" />
                Schedule for {recipientCount} recipient
                {recipientCount !== 1 ? "s" : ""}
              </span>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
