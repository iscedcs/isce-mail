"use client";

import React, { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { LoaderCircle, CheckCircle2, AlertCircle, UploadCloud, RefreshCw, Info } from "lucide-react";
import type { SyncedRecipient } from "@/lib/palmtechniq-users";

export type RecipientItem = { email: string; name: string; url?: string };

export default function CSVUploader({
  handleUpload,
  onSyncedCsv,
  onSyncedRecipients,
  productSlug = "palmtechniq",
  productName = "PalmTechniq",
  hasSyncUrl = true,
}: {
  handleUpload?: (e: any) => void;
  onSyncedCsv?: (emailsCsv: string) => void;
  /** Called with the full recipients array including names for personalisation. */
  onSyncedRecipients?: (recipients: RecipientItem[]) => void;
  productSlug?: string;
  productName?: string;
  hasSyncUrl?: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMeta, setUploadMeta] = useState<{
    total: number;
    fileName: string;
    invalidCount?: number;
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncWarning, setSyncWarning] = useState("");
  const [syncMeta, setSyncMeta] = useState<{
    total: number;
    fromCache: boolean;
  } | null>(null);

  // High-performance server-side CSV upload & parsing
  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Call parent handleUpload if provided for legacy state synchronization
    if (handleUpload) {
      try {
        handleUpload(event);
      } catch (err) {
        console.warn("[CSVUploader] legacy handleUpload warning:", err);
      }
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploadMeta(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/recipients/upload-csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to parse CSV file on server.");
      }

      if (onSyncedCsv && data.emailsCsv) {
        onSyncedCsv(data.emailsCsv);
      }

      if (onSyncedRecipients && Array.isArray(data.recipients)) {
        onSyncedRecipients(data.recipients);
      }

      setUploadMeta({
        total: data.total,
        fileName: file.name,
        invalidCount: data.invalidCount,
      });
    } catch (err: any) {
      console.error("[CSVUploader] API upload error, falling back locally:", err);
      setUploadError(err.message || "Failed to upload and parse CSV via API route.");
    } finally {
      setIsUploading(false);
    }
  };

  const syncUsers = async (forceRefresh = false) => {
    try {
      setSyncError("");
      setSyncWarning("");
      setSyncMeta(null);
      setIsSyncing(true);

      const targetSlug = productSlug || "palmtechniq";
      const refreshParam = forceRefresh ? "&refresh=1" : "";
      const url = `/api/recipients/sync?product=${encodeURIComponent(targetSlug)}${refreshParam}`;

      const response = await fetch(url, { method: "GET" });

      const payload = (await response.json()) as {
        recipients?: SyncedRecipient[];
        emailsCsv?: string;
        total?: number;
        fromCache?: boolean;
        warning?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to sync recipients");
      }

      if (payload.warning) {
        setSyncWarning(payload.warning);
      }

      if (payload.emailsCsv && onSyncedCsv) {
        onSyncedCsv(payload.emailsCsv);
      }

      if (payload.recipients && onSyncedRecipients) {
        onSyncedRecipients(
          payload.recipients.map((r) => ({
            email: r.email,
            name: r.name ?? "",
          })),
        );
      }

      setSyncMeta({
        total: payload.total ?? 0,
        fromCache: payload.fromCache ?? false,
      });
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const showSyncButton =
    hasSyncUrl ||
    productSlug.toLowerCase() === "palmtechniq" ||
    productSlug.toLowerCase() === "gada";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept=".csv"
          onChange={onFileChange}
          disabled={isUploading}
          className="cursor-pointer file:cursor-pointer"
        />
        {isUploading && (
          <span className="flex items-center text-xs text-primary font-medium shrink-0">
            <LoaderCircle className="h-4 w-4 animate-spin mr-1" />
            Uploading & parsing...
          </span>
        )}
      </div>

      {uploadMeta && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>{uploadMeta.fileName}</strong>: {uploadMeta.total.toLocaleString()} valid recipients loaded via API.
            {uploadMeta.invalidCount ? ` (${uploadMeta.invalidCount} invalid rows skipped)` : ""}
          </span>
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-1.5 text-xs text-destructive bg-red-50 px-2.5 py-1.5 rounded-md border border-red-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {showSyncButton && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => syncUsers(false)}
            disabled={isSyncing || isUploading}
            className="text-xs"
          >
            {isSyncing ? (
              <>
                <LoaderCircle className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Syncing...
              </>
            ) : (
              `Sync ${productName || "Audience"} Users`
            )}
          </Button>
          {syncMeta && syncMeta.fromCache && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground flex items-center gap-1"
              onClick={() => syncUsers(true)}
              disabled={isSyncing || isUploading}
            >
              <RefreshCw className="h-3 w-3" /> Cached · Refresh
            </Button>
          )}
        </div>
      )}

      {syncMeta && (
        <p className="text-xs text-muted-foreground">
          {syncMeta.total.toLocaleString()} recipients loaded
          {syncMeta.fromCache ? " (from cache)" : " (live)"}
        </p>
      )}
      {syncWarning && (
        <div className="flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-200 mt-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <span>{syncWarning}</span>
        </div>
      )}
      {syncError && (
        <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 px-2.5 py-2 rounded-md border border-red-200 mt-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
          <div className="space-y-1">
            <p className="font-medium">{syncError}</p>
            <p className="text-[11px] text-red-500">
              Tip: You can also attach a CSV file with your recipients using the file upload above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
