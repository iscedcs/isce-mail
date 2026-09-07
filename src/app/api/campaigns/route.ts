import { NextRequest, NextResponse } from "next/server";
import { listCampaigns, createCampaign } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listCampaigns());
}

export async function POST(req: NextRequest) {
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

  // If scheduledFor is in the past or absent, treat as immediate
  const scheduledFor: string | undefined = body.scheduledFor
    ? new Date(body.scheduledFor) > new Date()
      ? body.scheduledFor
      : undefined
    : undefined;

  const campaign = createCampaign({
    type: body.type,
    basis: body.basis,
    subject: body.subject,
    message: body.message,
    link: body.link,
    templateProps: body.templateProps || body,
    status: scheduledFor ? "scheduled" : "sending",
    scheduledFor,
    recipients: (body.recipients as { email: string; firstname?: string; name?: string; url?: string }[]).map((r) => ({
      email: r.email,
      firstname: r.firstname ?? r.name ?? "",
      url: r.url,
      events: {},
    })),
  });

  // If no scheduledFor, dispatch immediately via the existing send route
  if (!scheduledFor) {
    try {
      const url = new URL(`/api/send/${campaign.type}`, req.url);
      await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          campaignId: campaign.id,
          recipients: campaign.recipients,
        }),
      });
    } catch {
      // Fire and forget — campaign record already created
    }
  }

  return NextResponse.json(campaign, { status: 201 });
}
