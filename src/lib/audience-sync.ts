/**
 * audience-sync.ts
 *
 * One generic client for pulling recipients from any ISCE product.
 *
 * Replaces `palmtechniq-users.ts`. The old shape was a hand-written client file
 * plus three env vars (`<PRODUCT>_SYNC_BASE_URL`, `_SYNC_API_KEY`,
 * `_SYNC_CACHE_TTL_SECONDS`) for every source — so onboarding a product meant a
 * new file, new env vars and a deploy. That does not scale past two or three.
 *
 * The model here is a contract, not a client per product:
 *
 *   - any service that serves
 *       { data: [...], paging: { hasMore, nextCursor, limit } }
 *     accepts `limit` / `cursor` / `since`, and authenticates on
 *     `x-integration-key` can be an audience source
 *   - where to reach it lives in the DATABASE (`Product.syncUrl` /
 *     `Product.syncApiKey`, key encrypted), edited in Admin -> Brands
 *
 * Adding a source is therefore two fields in the admin UI — no file, no env
 * var, no deploy. The only per-product knowledge left in this file is the
 * legacy env fallback below, kept so existing PalmTechniq deployments keep
 * working if their Product row has no syncUrl yet.
 */

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncedRecipient = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  updatedAt: string;
  createdAt: string;
};

export type AudienceSource = {
  slug: string;
  name: string;
  /** True when this product has somewhere to sync from. */
  configured: boolean;
};

export type SourceOutcome = {
  slug: string;
  name: string;
  total: number;
  fromCache: boolean;
  /** Present when this source failed; other sources still return their rows. */
  error?: string;
};

export type AudienceResult = {
  recipients: SyncedRecipient[];
  emailsCsv: string;
  total: number;
  bySource: SourceOutcome[];
};

type RemoteResponse = {
  data?: SyncedRecipient[];
  paging?: { hasMore?: boolean; nextCursor?: string | null; limit?: number };
};

// ---------------------------------------------------------------------------
// Endpoint resolution
// ---------------------------------------------------------------------------

/**
 * Back-compat only. A product whose `syncUrl` is set in the DB never consults
 * this. Do NOT add entries here for new products — set their Sync URL in
 * Admin -> Brands instead.
 */
const LEGACY_ENV_FALLBACK: Record<string, { url?: string; key?: string }> = {
  palmtechniq: {
    url: process.env.PALMTECHNIQ_SYNC_BASE_URL,
    key: process.env.PALMTECHNIQ_SYNC_API_KEY,
  },
};

/** The path every ISCE audience provider serves, appended to a bare origin. */
const CONVENTIONAL_PATH = "/api/integrations/mailing/users";

/**
 * Turn a configured URL into a request URL.
 *
 * Operators store either a bare origin (`https://palmtechniq.com`) or a full
 * endpoint (`https://auth.isce.tech/integrations/mailing/users`). Appending the
 * conventional path only when the URL has no path of its own supports both
 * without knowing which product it is.
 */
function toEndpoint(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/$/, "");
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname === "" || parsed.pathname === "/") {
      return `${trimmed}${CONVENTIONAL_PATH}`;
    }
    return trimmed;
  } catch {
    // Not a parseable URL — hand it back and let fetch report the problem.
    return trimmed;
  }
}

type ResolvedSource = {
  slug: string;
  name: string;
  endpoint: string;
  apiKey: string;
};

function decryptKey(value: string | null): string {
  if (!value) return "";
  try {
    return decrypt(value);
  } catch {
    // Older rows stored the key in plain text.
    return value;
  }
}

async function resolveSource(slug: string): Promise<ResolvedSource | null> {
  const product = await prisma.product.findFirst({
    where: { slug: { equals: slug, mode: "insensitive" } },
    select: { slug: true, name: true, syncUrl: true, syncApiKey: true },
  });

  const legacy = LEGACY_ENV_FALLBACK[slug.toLowerCase()];

  const url = product?.syncUrl?.trim() || legacy?.url;
  if (!url) return null;

  const apiKey = decryptKey(product?.syncApiKey ?? null) || legacy?.key || "";

  return {
    slug: product?.slug ?? slug,
    name: product?.name ?? slug,
    endpoint: toEndpoint(url),
    apiKey,
  };
}

/** Every product that can currently be synced from, for the source picker. */
export async function listAudienceSources(): Promise<AudienceSource[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true, name: true, syncUrl: true },
    orderBy: { name: "asc" },
  });

  return products
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      configured:
        !!p.syncUrl?.trim() || !!LEGACY_ENV_FALLBACK[p.slug.toLowerCase()]?.url,
    }))
    .filter((p) => p.configured);
}

// ---------------------------------------------------------------------------
// Cache — generic, keyed by slug
// ---------------------------------------------------------------------------

type CacheEntry = { recipients: SyncedRecipient[]; cachedAt: number };

const cache = new Map<string, CacheEntry>();

function cacheTtlMs(): number {
  const raw = Number(
    process.env.AUDIENCE_SYNC_CACHE_TTL_SECONDS ??
      // Superseded but still honoured so an existing deployment's tuning is
      // not silently ignored.
      process.env.PALMTECHNIQ_SYNC_CACHE_TTL_SECONDS,
  );
  const secs = Number.isFinite(raw) && raw > 0 ? raw : 300;
  return secs * 1000;
}

/** Drop cached rows for one source, or all of them when no slug is given. */
export function invalidateAudienceCache(slug?: string): void {
  if (slug) cache.delete(slug.toLowerCase());
  else cache.clear();
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function fetchSource(
  source: ResolvedSource,
  options: { since?: string; refresh?: boolean },
): Promise<{ recipients: SyncedRecipient[]; fromCache: boolean }> {
  const key = source.slug.toLowerCase();
  const isFullSync = !options.since;

  // Delta syncs always go to the network — the point of `since` is freshness.
  if (isFullSync && !options.refresh) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.cachedAt < cacheTtlMs()) {
      return { recipients: hit.recipients, fromCache: true };
    }
  }

  if (!source.apiKey) {
    throw new Error(
      `No sync API key configured for "${source.name}". Add one in Admin -> Brands.`,
    );
  }

  const collected = new Map<string, SyncedRecipient>();
  let hasMore = true;
  let cursor: string | null = null;
  let pages = 0;

  while (hasMore) {
    // A provider that always reports hasMore would otherwise loop forever.
    if (pages++ > 200) {
      throw new Error(
        `Sync from "${source.name}" exceeded 200 pages — the endpoint is likely not advancing its cursor.`,
      );
    }

    const params = new URLSearchParams({ limit: "500" });
    if (cursor) params.set("cursor", cursor);
    if (options.since) params.set("since", options.since);

    const separator = source.endpoint.includes("?") ? "&" : "?";
    const url = `${source.endpoint}${separator}${params.toString()}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          // Providers differ in which header they read; send the set they
          // collectively accept rather than special-casing per product.
          "x-integration-key": source.apiKey,
          "x-api-key": source.apiKey,
          Authorization: `Bearer ${source.apiKey}`,
        },
        cache: "no-store",
      });
    } catch (netErr: any) {
      const code = netErr?.cause?.code || netErr?.code;
      if (code === "ECONNREFUSED" || netErr?.message?.includes("fetch failed")) {
        throw new Error(
          `Unable to reach "${source.name}" at ${source.endpoint} — the server is offline or unreachable.`,
        );
      }
      throw netErr;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `"${source.name}" returned ${response.status}: ${text.slice(0, 200)}`,
      );
    }

    const payload: RemoteResponse | SyncedRecipient[] = await response.json();
    const list = Array.isArray(payload) ? payload : payload.data ?? [];

    for (const r of list) {
      if (r?.email) collected.set(r.email.trim().toLowerCase(), r);
    }

    const paging = Array.isArray(payload) ? undefined : payload.paging;
    hasMore = paging?.hasMore ?? false;
    cursor = paging?.nextCursor ?? null;
    if (hasMore && !cursor) break; // nothing to advance on
  }

  const recipients = Array.from(collected.values())
    .filter((r) => r.isActive !== false)
    .sort((a, b) => a.email.localeCompare(b.email));

  if (isFullSync) {
    cache.set(key, { recipients, cachedAt: Date.now() });
  }

  return { recipients, fromCache: false };
}

/**
 * Pull from one or more sources and merge them.
 *
 * Sources are fetched independently: one being offline degrades that source to
 * an error entry in `bySource` rather than failing the whole sync, so a
 * PalmTechniq outage never blocks an ISCE Auth pull.
 *
 * Earlier sources win on duplicate addresses, which keeps the merge stable
 * regardless of which source happens to return first.
 */
export async function fetchAudiences(
  slugs: string[],
  options: { since?: string; refresh?: boolean } = {},
): Promise<AudienceResult> {
  const unique = Array.from(
    new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean)),
  );

  const settled = await Promise.all(
    unique.map(async (slug): Promise<{ outcome: SourceOutcome; rows: SyncedRecipient[] }> => {
      const source = await resolveSource(slug);
      if (!source) {
        return {
          outcome: {
            slug,
            name: slug,
            total: 0,
            fromCache: false,
            error: `"${slug}" has no Sync URL configured. Set one in Admin -> Brands.`,
          },
          rows: [],
        };
      }

      try {
        const { recipients, fromCache } = await fetchSource(source, options);
        return {
          outcome: {
            slug: source.slug,
            name: source.name,
            total: recipients.length,
            fromCache,
          },
          rows: recipients,
        };
      } catch (err) {
        return {
          outcome: {
            slug: source.slug,
            name: source.name,
            total: 0,
            fromCache: false,
            error: err instanceof Error ? err.message : String(err),
          },
          rows: [],
        };
      }
    }),
  );

  const merged = new Map<string, SyncedRecipient>();
  for (const { rows } of settled) {
    for (const r of rows) {
      const email = r.email.trim().toLowerCase();
      if (!merged.has(email)) merged.set(email, { ...r, email });
    }
  }

  const recipients = Array.from(merged.values()).sort((a, b) =>
    a.email.localeCompare(b.email),
  );

  return {
    recipients,
    emailsCsv: recipients.map((r) => r.email).join(","),
    total: recipients.length,
    bySource: settled.map((s) => s.outcome),
  };
}
