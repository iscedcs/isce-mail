import { NextRequest, NextResponse } from "next/server";
import { getEmailEvents, clearEmailEvents } from "@/lib/email-events";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin authentication required." },
      { status: 401 },
    );
  }
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 200);
  return NextResponse.json(getEmailEvents(limit));
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin authentication required." },
      { status: 401 },
    );
  }
  clearEmailEvents();
  return NextResponse.json({ ok: true });
}
