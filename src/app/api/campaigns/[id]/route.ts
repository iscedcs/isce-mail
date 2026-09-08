import { NextRequest, NextResponse } from "next/server";
import { getCampaignBatchesFromDb, cancelCampaignInDb } from "@/lib/campaign-db";
import { getCampaign, cancelCampaign } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
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
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await cancelCampaignInDb(params.id);
  } catch (err) {
    console.error("[api/campaigns/[id]] DB cancel error:", err);
  }

  const campaign = cancelCampaign(params.id);
  return NextResponse.json({ ok: true, campaign });
}

