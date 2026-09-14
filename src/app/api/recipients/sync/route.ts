import { NextRequest, NextResponse } from "next/server";
import { resolveProduct } from "@/lib/product-resolver";
import {
  fetchPalmTechniqRecipients,
  invalidatePalmTechniqCache,
  SyncedRecipient,
} from "@/lib/palmtechniq-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const productSlug = searchParams.get("product") || searchParams.get("basis") || "palmtechniq";
    const refresh = searchParams.get("refresh") === "1";
    const since = searchParams.get("since") || undefined;

    const product = await resolveProduct(productSlug);

    // If PalmTechniq, use the existing optimized client
    if (product.slug === "palmtechniq") {
      if (refresh) {
        invalidatePalmTechniqCache();
      }
      const result = await fetchPalmTechniqRecipients({ since });
      return NextResponse.json({
        success: true,
        product: product.name,
        recipients: result.recipients,
        emailsCsv: result.emailsCsv,
        total: result.total,
        fromCache: result.fromCache,
        syncedAt: new Date().toISOString(),
      });
    }

    // For any other product (e.g. Gada)
    if (!product.syncUrl) {
      return NextResponse.json(
        {
          success: false,
          error: `Product "${product.name}" does not have an external user sync URL configured.`,
        },
        { status: 400 },
      );
    }

    const baseUrl = product.syncUrl.replace(/\/$/, "");
    const apiKey = product.syncApiKey;

    const collected = new Map<string, SyncedRecipient>();
    let hasMore = true;
    let cursor: string | null = null;

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
  } catch (error: any) {
    console.error("[api/recipients/sync] Sync error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Sync failed" },
      { status: 500 },
    );
  }
}
