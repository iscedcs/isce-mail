import { NextRequest, NextResponse } from "next/server";
import { checkAndRunScheduledCampaigns } from "@/lib/scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handleTick(req: NextRequest) {
  // Accepts three callers:
  //   - Vercel Cron       → Authorization: Bearer $CRON_SECRET
  //   - GitHub Actions    → x-scheduler-secret: $SCHEDULER_SECRET
  //   - manual curl       → either of the above
  const secret = process.env.SCHEDULER_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  const accepted = [secret, cronSecret].filter(Boolean) as string[];

  if (accepted.length > 0) {
    const headerSecret = req.headers.get("x-scheduler-secret");
    const authHeader = req.headers.get("authorization");
    const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    const ok =
      (headerSecret && accepted.includes(headerSecret)) ||
      (bearerSecret && accepted.includes(bearerSecret));

    if (!ok) {
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
