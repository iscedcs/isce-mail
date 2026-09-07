import { NextRequest, NextResponse } from "next/server";
import { checkAndRunScheduledCampaigns } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

async function handleTick(req: NextRequest) {
  // Optional: protect with a secret header or bearer token
  const secret = process.env.SCHEDULER_SECRET;
  if (secret) {
    const headerSecret = req.headers.get("x-scheduler-secret");
    const authHeader = req.headers.get("authorization");
    const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (headerSecret !== secret && bearerSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await checkAndRunScheduledCampaigns();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest) {
  return handleTick(req);
}

export async function POST(req: NextRequest) {
  return handleTick(req);
}
