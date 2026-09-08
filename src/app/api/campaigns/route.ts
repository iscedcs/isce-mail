import { NextRequest, NextResponse } from "next/server";
import {
  createCampaignWithBatches,
  listCampaignsFromDb,
} from "@/lib/campaign-db";
import { listCampaigns } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const campaigns = await listCampaignsFromDb();
    return NextResponse.json(campaigns);
  } catch (err) {
    console.error("[api/campaigns] DB fetch error, falling back to local:", err);
    return NextResponse.json(listCampaigns());
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.type || !body.basis || !body.subject || !body.message) {
      return NextResponse.json(
        { error: "type, basis, subject, and message are required." },
        { status: 400 },
      );
    }

    if (!body.recipients?.length) {
      return NextResponse.json(
        { error: "At least one recipient is required." },
        { status: 400 },
      );
    }

    // Pass to Prisma batch creator:
    // - Deduplicates & cleans emails
    // - Excludes bounced/suppressed contacts to protect 100/day quota
    // - Segments into 100-recipient daily batches (Batch 1 now, Batch 2 +24h, Batch 3 +48h)
    // - Dispatches Batch 1 immediately
    const result = await createCampaignWithBatches({
      type: body.type,
      basis: body.basis,
      subject: body.subject,
      message: body.message,
      link: body.link,
      templateProps: body.templateProps || body,
      recipients: body.recipients,
      batchSize: body.batchSize || 100,
      scheduledFor: body.scheduledFor,
    });

    return NextResponse.json(
      {
        ok: true,
        id: result.campaignId,
        ...result,
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("[api/campaigns] Error creating campaign:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create campaign." },
      { status: 500 },
    );
  }
}

