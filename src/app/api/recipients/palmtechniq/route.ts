import { NextRequest, NextResponse } from "next/server";
import {
  fetchPalmTechniqRecipients,
  invalidatePalmTechniqCache,
} from "@/lib/palmtechniq-users";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // ?refresh=1 forces a cache bypass for the next full sync.
    if (req.nextUrl.searchParams.get("refresh") === "1") {
      invalidatePalmTechniqCache();
    }

    const since = req.nextUrl.searchParams.get("since") || undefined;
    const result = await fetchPalmTechniqRecipients({ since });

    return NextResponse.json({
      recipients: result.recipients,
      emailsCsv: result.emailsCsv,
      total: result.total,
      fromCache: result.fromCache,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
