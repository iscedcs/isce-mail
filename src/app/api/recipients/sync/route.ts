import { NextRequest, NextResponse } from "next/server";
import { resolveProduct } from "@/lib/product-resolver";
import { prisma } from "@/lib/prisma";
import { isDeliverableEmail } from "@/lib/mail-action/shared";
import {
  fetchPalmTechniqRecipients,
  invalidatePalmTechniqCache,
  SyncedRecipient,
} from "@/lib/palmtechniq-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fallback recipient loader from Neon Postgres when external sync endpoints are offline.
 * Collects distinct active recipients previously saved in campaigns and contact tables.
 */
async function getDatabaseFallbackRecipients(basis: string): Promise<SyncedRecipient[]> {
  try {
    const collected = new Map<string, SyncedRecipient>();

    // 1. Query past campaign recipients for this brand
    const campaignRecipients = await prisma.campaignRecipient.findMany({
      where: {
        campaign: { basis: { in: [basis, basis.toLowerCase(), basis.toUpperCase()] } },
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

    // 2. Query general contacts table
    const contacts = await prisma.contact.findMany({
      where: {
        status: { notIn: ["bounced", "suppressed"] },
      },
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

    return Array.from(collected.values()).sort((a, b) => a.email.localeCompare(b.email));
  } catch (err) {
    console.error("[api/recipients/sync] DB fallback error:", err);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const productSlug = searchParams.get("product") || searchParams.get("basis") || "palmtechniq";
    const refresh = searchParams.get("refresh") === "1";
    const since = searchParams.get("since") || undefined;

    const product = await resolveProduct(productSlug);

    // 1. PalmTechniq Product Sync
    if (product.slug === "palmtechniq") {
      if (refresh) {
        invalidatePalmTechniqCache();
      }

      const effectiveBaseUrl = product.syncUrl || process.env.PALMTECHNIQ_SYNC_BASE_URL || "http://localhost:2026";
      const effectiveApiKey = product.syncApiKey || process.env.PALMTECHNIQ_SYNC_API_KEY || "pt_live_key";

      try {
        const result = await fetchPalmTechniqRecipients({
          since,
          baseUrl: effectiveBaseUrl,
          apiKey: effectiveApiKey,
        });

        return NextResponse.json({
          success: true,
          product: product.name,
          recipients: result.recipients,
          emailsCsv: result.emailsCsv,
          total: result.total,
          fromCache: result.fromCache,
          syncedAt: new Date().toISOString(),
        });
      } catch (remoteErr: any) {
        console.warn(
          `[api/recipients/sync] Remote sync to PalmTechniq failed (${remoteErr.message}). Checking database fallback...`,
        );

        const fallback = await getDatabaseFallbackRecipients("palmtechniq");
        if (fallback.length > 0) {
          return NextResponse.json({
            success: true,
            product: product.name,
            recipients: fallback,
            emailsCsv: fallback.map((r) => r.email).join(","),
            total: fallback.length,
            fromCache: true,
            fromDatabaseFallback: true,
            warning: `External sync server (${effectiveBaseUrl}) is offline. Loaded ${fallback.length} recipients from local database.`,
            syncedAt: new Date().toISOString(),
          });
        }

        // Return clear, actionable error
        return NextResponse.json(
          {
            success: false,
            error: `Unable to connect to PalmTechniq audience server at ${effectiveBaseUrl}. The server is offline or unreachable (ECONNREFUSED). Please verify your PalmTechniq service is running, update the Audience Sync URL in Admin Brands, or upload a CSV file directly.`,
          },
          { status: 502 },
        );
      }
    }

    // 2. Generic Product Sync (e.g. Gada, Connect)
    if (!product.syncUrl) {
      // Check if we have contacts in DB for this product before giving up
      const fallback = await getDatabaseFallbackRecipients(product.slug);
      if (fallback.length > 0) {
        return NextResponse.json({
          success: true,
          product: product.name,
          recipients: fallback,
          emailsCsv: fallback.map((r) => r.email).join(","),
          total: fallback.length,
          fromCache: true,
          fromDatabaseFallback: true,
          warning: `No external sync URL configured. Loaded ${fallback.length} recipients from database.`,
          syncedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: `Product "${product.name}" does not have an external audience sync URL configured. You can upload a CSV file or configure a Sync URL in Admin Brands.`,
        },
        { status: 400 },
      );
    }

    const baseUrl = product.syncUrl.replace(/\/$/, "");
    const apiKey = product.syncApiKey;

    const collected = new Map<string, SyncedRecipient>();
    let hasMore = true;
    let cursor: string | null = null;

    try {
      while (hasMore) {
        const params = new URLSearchParams({ limit: "500" });
        if (cursor) params.set("cursor", cursor);
        if (since) params.set("since", since);

        const headers: Record<string, string> = {};
        if (apiKey) {
          headers["x-integration-key"] = apiKey;
          headers["Authorization"] = `Bearer ${apiKey}`;
        }

        const response = await fetch(`${baseUrl}?${params.toString()}`, {
          method: "GET",
          headers,
          cache: "no-store",
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            `External sync error from ${product.name} (${response.status}): ${text}`,
          );
        }

        const payload = await response.json();
        const list: SyncedRecipient[] = Array.isArray(payload) ? payload : payload.data || [];

        for (const recipient of list) {
          if (recipient.email) {
            collected.set(recipient.email.trim().toLowerCase(), recipient);
          }
        }

        hasMore = payload.paging?.hasMore ?? false;
        cursor = payload.paging?.nextCursor ?? null;
      }

      const recipients = Array.from(collected.values())
        .filter((r) => r.isActive !== false)
        .sort((a, b) => a.email.localeCompare(b.email));

      return NextResponse.json({
        success: true,
        product: product.name,
        recipients,
        emailsCsv: recipients.map((r) => r.email).join(","),
        total: recipients.length,
        fromCache: false,
        syncedAt: new Date().toISOString(),
      });
    } catch (fetchErr: any) {
      console.warn(`[api/recipients/sync] External sync to ${baseUrl} failed:`, fetchErr);

      const fallback = await getDatabaseFallbackRecipients(product.slug);
      if (fallback.length > 0) {
        return NextResponse.json({
          success: true,
          product: product.name,
          recipients: fallback,
          emailsCsv: fallback.map((r) => r.email).join(","),
          total: fallback.length,
          fromCache: true,
          fromDatabaseFallback: true,
          warning: `Sync server (${baseUrl}) is offline. Loaded ${fallback.length} recipients from database.`,
          syncedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: `Unable to connect to sync endpoint at ${baseUrl} (${fetchErr.message}). Please verify the server is running or upload a CSV file instead.`,
        },
        { status: 502 },
      );
    }
  } catch (error: any) {
    console.error("[api/recipients/sync] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Sync failed" },
      { status: 500 },
    );
  }
}
