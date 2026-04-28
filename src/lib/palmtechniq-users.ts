export type SyncedRecipient = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  updatedAt: string;
  createdAt: string;
};

export type SyncResult = {
  recipients: SyncedRecipient[];
  emailsCsv: string;
  total: number;
};

type RemoteSyncResponse = {
  data: SyncedRecipient[];
  paging?: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
  };
};

// ---------------------------------------------------------------------------
// In-memory cache for full syncs (no `since` param).
// Delta syncs (with `since`) always bypass the cache to stay current.
// TTL is 5 minutes — adjust via PALMTECHNIQ_SYNC_CACHE_TTL_SECONDS env var.
// ---------------------------------------------------------------------------
type CacheEntry = {
  result: SyncResult;
  cachedAt: number;
};

let fullSyncCache: CacheEntry | null = null;

function getCacheTtlMs(): number {
  const envSecs = Number(process.env.PALMTECHNIQ_SYNC_CACHE_TTL_SECONDS);
  const secs = Number.isFinite(envSecs) && envSecs > 0 ? envSecs : 300;
  return secs * 1000;
}

/** Invalidate the in-memory cache immediately (e.g. after a manual refresh). */
export function invalidatePalmTechniqCache(): void {
  fullSyncCache = null;
}

function getPalmTechniqSyncConfig() {
  const baseUrl =
    process.env.PALMTECHNIQ_SYNC_BASE_URL || "http://localhost:2026";
  const apiKey = process.env.PALMTECHNIQ_SYNC_API_KEY;

  if (!apiKey) {
    throw new Error("PALMTECHNIQ_SYNC_API_KEY is not configured.");
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
  };
}

export async function fetchPalmTechniqRecipients(options?: {
  since?: string;
}): Promise<SyncResult & { fromCache: boolean }> {
  const isFullSync = !options?.since;

  // Return cached result for full syncs that are still within TTL.
  if (isFullSync && fullSyncCache) {
    const age = Date.now() - fullSyncCache.cachedAt;
    if (age < getCacheTtlMs()) {
      return { ...fullSyncCache.result, fromCache: true };
    }
  }

  const { baseUrl, apiKey } = getPalmTechniqSyncConfig();
  const collected = new Map<string, SyncedRecipient>();

  let hasMore = true;
  let cursor: string | null = null;

  while (hasMore) {
    const params = new URLSearchParams({ limit: "500" });
    if (cursor) params.set("cursor", cursor);
    if (options?.since) params.set("since", options.since);

    const response = await fetch(
      `${baseUrl}/api/integrations/mailing/users?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "x-integration-key": apiKey,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Failed to fetch recipients (${response.status}): ${text}`,
      );
    }

    const payload = (await response.json()) as RemoteSyncResponse;
    for (const recipient of payload.data || []) {
      if (recipient.email) {
        collected.set(recipient.email.trim().toLowerCase(), recipient);
      }
    }

    hasMore = payload.paging?.hasMore ?? false;
    cursor = payload.paging?.nextCursor ?? null;
  }

  const recipients = Array.from(collected.values())
    .filter((recipient) => recipient.isActive)
    .sort((a, b) => a.email.localeCompare(b.email));

  const result: SyncResult = {
    recipients,
    emailsCsv: recipients.map((recipient) => recipient.email).join(","),
    total: recipients.length,
  };

  // Populate cache only for full syncs.
  if (isFullSync) {
    fullSyncCache = { result, cachedAt: Date.now() };
  }

  return { ...result, fromCache: false };
}
