import { NextRequest, NextResponse } from "next/server";
import { getEmailEvents, clearEmailEvents } from "@/lib/email-events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 200);
  return NextResponse.json(getEmailEvents(limit));
}

export async function DELETE() {
  clearEmailEvents();
  return NextResponse.json({ ok: true });
}
