import { NextRequest, NextResponse } from "next/server";
import { getCampaignBatchesFromDb, cancelCampaignInDb } from "@/lib/campaign-db";
import { getCampaign, cancelCampaign } from "@/lib/campaigns";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin authentication required." },
      { status: 401 },
    );
  }
  try {
    const dbResult = await getCampaignBatchesFromDb(params.id);
    if (dbResult) {
      return NextResponse.json(dbResult);
    }
  } catch (err) {
    console.error("[api/campaigns/[id]] DB lookup error:", err);
  }

  const campaign = getCampaign(params.id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(campaign);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin authentication required to cancel campaigns." },
      { status: 401 },
    );
  }
  try {
    await cancelCampaignInDb(params.id);
  } catch (err) {
    console.error("[api/campaigns/[id]] DB cancel error:", err);
  }

  const campaign = cancelCampaign(params.id);
  return NextResponse.json({ ok: true, campaign });
}

