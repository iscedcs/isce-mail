import { NextRequest, NextResponse } from "next/server";
import { getCampaign, cancelCampaign } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
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
  const campaign = cancelCampaign(params.id);
  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign not found or not cancellable." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, campaign });
}
