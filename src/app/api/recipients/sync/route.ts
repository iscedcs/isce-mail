import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDeliverableEmail } from "@/lib/mail-action/shared";
import {
  fetchAudiences,
  invalidateAudienceCache,
  type SyncedRecipient,
} from "@/lib/audience-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Recipients previously seen locally, used when every external source is down.
 *
 * Deliberately not per-product: it draws on whatever this install has already
 * mailed, which is the best answer available when the upstream is unreachable.
 */
async function getDatabaseFallbackRecipients(
  basis?: string,
): Promise<SyncedRecipient[]> {
  try {
    const collected = new Map<string, SyncedRecipient>();

    const campaignRecipients = await prisma.campaignRecipient.findMany({
      where: {
        ...(basis
          ? {
              campaign: {
                basis: { in: [basis, basis.toLowerCase(), basis.toUpperCase()] },
              },
            }
          : {}),
        status: { notIn: ["bounced", "suppressed"] },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        createdAt: true,
        updatedAt: true,
      },
      distinct: ["email"],
      take: 2000,
    });

    for (const r of campaignRecipients) {
      const email = r.email.trim().toLowerCase();
      if (email && isDeliverableEmail(email) && !collected.has(email)) {
        collected.set(email, {
          id: r.id,
          email,
          name: r.firstName || "",
          isActive: true,
          updatedAt: r.updatedAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
        });
      }
    }

    const contacts = await prisma.contact.findMany({
      where: { status: { notIn: ["bounced", "suppressed"] } },
      select: {
        id: true,
        email: true,
        firstName: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 2000,
    });

    for (const c of contacts) {
      const email = c.email.trim().toLowerCase();
      if (email && isDeliverableEmail(email) && !collected.has(email)) {
        collected.set(email, {
          id: c.id,
          email,
          name: c.firstName || "",
          isActive: true,
          updatedAt: c.updatedAt.toISOString(),
          createdAt: c.createdAt.toISOString(),
        });
      }
    }

    return Array.from(collected.values()).sort((a, b) =>
      a.email.localeCompare(b.email),
    );
  } catch (err) {
    console.error("[api/recipients/sync] DB fallback error:", err);
    return [];
  }
}

/**
 * GET /api/recipients/sync
 *
 *   ?sources=palmtechniq,isce   pull from several products and merge
 *   ?product=palmtechniq        single source (back-compat)
 *   &since=<iso>                delta sync, bypasses the cache
 *   &refresh=1                  force a cache bypass
 *
 * There is no per-product branch here any more. Every source resolves through
 * `Product.syncUrl` / `Product.syncApiKey`, so onboarding a product is two
 * fields in Admin -> Brands rather than a code change.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const requested = (sp.get("sources") || sp.get("product") || sp.get("basis") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (requested.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No sync source selected. Pass ?sources=<slug>[,<slug>] — the products listed by /api/recipients/sources.",
        },
        { status: 400 },
      );
    }

    const refresh = sp.get("refresh") === "1";
    const since = sp.get("since") || undefined;

    if (refresh) {
      for (const slug of requested) invalidateAudienceCache(slug);
    }

    const result = await fetchAudiences(requested, { since, refresh });

    const failed = result.bySource.filter((s) => s.error);
    const succeeded = result.bySource.filter((s) => !s.error);

    // Every source failed AND nothing was merged — fall back to local history
    // so the operator can still send something.
    if (succeeded.length === 0 && result.total === 0) {
      const fallback = await getDatabaseFallbackRecipients(requested[0]);
      if (fallback.length > 0) {
        return NextResponse.json({
          success: true,
          recipients: fallback,
          emailsCsv: fallback.map((r) => r.email).join(","),
          total: fallback.length,
          fromCache: true,
          fromDatabaseFallback: true,
          bySource: result.bySource,
          warning: `Could not reach ${failed.map((f) => f.name).join(", ")}. Loaded ${fallback.length} recipients from local history instead.`,
          syncedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json(
        {
          success: false,
          bySource: result.bySource,
          error:
            failed.map((f) => f.error).join(" · ") ||
            "No recipients returned and no local history to fall back on.",
        },
        { status: 502 },
      );
    }

    // Partial failure still returns rows — one source being down must not block
    // the others.
    const warning =
      failed.length > 0
        ? `${failed.map((f) => `${f.name}: ${f.error}`).join(" · ")}`
        : undefined;

    return NextResponse.json({
      success: true,
      recipients: result.recipients,
      emailsCsv: result.emailsCsv,
      total: result.total,
      fromCache: result.bySource.every((s) => s.fromCache),
      bySource: result.bySource,
      ...(warning ? { warning } : {}),
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[api/recipients/sync] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Sync failed" },
      { status: 500 },
    );
  }
}
