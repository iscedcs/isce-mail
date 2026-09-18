import { NextRequest, NextResponse } from "next/server";
import { getCampaignBatchesFromDb, cancelCampaignInDb } from "@/lib/campaign-db";
import { getCampaign, cancelCampaign } from "@/lib/campaigns";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin authentication required." },
      { status: 401 },
    );
  }
  try {
    const dbResult = await getCampaignBatchesFromDb(id);
    if (dbResult) {
      return NextResponse.json(dbResult);
    }
  } catch (err) {
    console.error("[api/campaigns/[id]] DB lookup error:", err);
  }

  const campaign = getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(campaign);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin authentication required to cancel campaigns." },
      { status: 401 },
    );
  }
  try {
    await cancelCampaignInDb(id);
  } catch (err) {
    console.error("[api/campaigns/[id]] DB cancel error:", err);
  }

  const campaign = cancelCampaign(id);
  return NextResponse.json({ ok: true, campaign });
}

