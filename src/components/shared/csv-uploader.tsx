"use client";

import React, { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import type { SyncedRecipient } from "@/lib/palmtechniq-users";

export type RecipientItem = { email: string; name: string };

export default function CSVUploader({
  handleUpload,
  onSyncedCsv,
  onSyncedRecipients,
}: {
  handleUpload: (e: any) => void;
  onSyncedCsv?: (emailsCsv: string) => void;
  /** Called with the full recipients array including names for personalisation. */
  onSyncedRecipients?: (recipients: RecipientItem[]) => void;
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncMeta, setSyncMeta] = useState<{
    total: number;
    fromCache: boolean;
  } | null>(null);

  const syncPalmTechniqUsers = async (forceRefresh = false) => {
    try {
      setSyncError("");
      setSyncMeta(null);
      setIsSyncing(true);

      const url = forceRefresh
        ? "/api/recipients/palmtechniq?refresh=1"
        : "/api/recipients/palmtechniq";

      const response = await fetch(url, { method: "GET" });

      const payload = (await response.json()) as {
        recipients?: SyncedRecipient[];
        emailsCsv?: string;
        total?: number;
        fromCache?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to sync recipients");
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

  return (
    <div className="space-y-2">
      <Input type="file" accept=".csv" onChange={handleUpload} />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => syncPalmTechniqUsers(false)}
          disabled={isSyncing}>
          {isSyncing ? "Syncing..." : "Sync PalmTechniq Users"}
        </Button>
        {syncMeta && syncMeta.fromCache && (
          <Button
            type="button"
            variant="ghost"
            className="text-xs text-muted-foreground"
            onClick={() => syncPalmTechniqUsers(true)}
            disabled={isSyncing}>
            Cached · Refresh
          </Button>
        )}
      </div>
      {syncMeta && (
        <p className="text-xs text-muted-foreground">
          {syncMeta.total} recipients loaded
          {syncMeta.fromCache ? " (from cache)" : " (live)"}
        </p>
      )}
      {syncError && <p className="text-sm text-red-600">{syncError}</p>}
    </div>
  );
}
