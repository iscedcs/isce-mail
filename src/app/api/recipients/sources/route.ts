import { NextResponse } from "next/server";
import { listAudienceSources } from "@/lib/audience-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/recipients/sources
 *
 * The products the operator can currently sync an audience from — any product
 * with a Sync URL configured in Admin -> Brands. The picker is driven entirely
 * by this, so a newly onboarded product appears without a code change.
 */
export async function GET() {
  try {
    const sources = await listAudienceSources();
    return NextResponse.json({ success: true, sources });
  } catch (error: any) {
    console.error("[api/recipients/sources] error:", error);
    return NextResponse.json(
      { success: false, sources: [], error: error?.message || "Failed to list sources" },
      { status: 500 },
    );
  }
}
