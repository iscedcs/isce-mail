import { NextRequest, NextResponse } from "next/server";
import { fetchAudiences, invalidateAudienceCache } from "@/lib/audience-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Back-compat shim.
 *
 * Kept so any existing bookmark or integration pointing here keeps working.
 * New callers should use /api/recipients/sync?sources=<slug>[,<slug>], which
 * takes any number of products and merges them.
 */
export async function GET(req: NextRequest) {
  try {
    if (req.nextUrl.searchParams.get("refresh") === "1") {
      invalidateAudienceCache("palmtechniq");
    }

    const since = req.nextUrl.searchParams.get("since") || undefined;
    const result = await fetchAudiences(["palmtechniq"], { since });

    const failure = result.bySource.find((s) => s.error);
    if (failure && result.total === 0) {
      return NextResponse.json({ error: failure.error }, { status: 502 });
    }

    return NextResponse.json({
      recipients: result.recipients,
      emailsCsv: result.emailsCsv,
      total: result.total,
      fromCache: result.bySource.every((s) => s.fromCache),
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
