import { NextRequest, NextResponse } from "next/server";
import { getSendHistory, clearSendHistory } from "@/lib/send-history";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin authentication required." },
      { status: 401 },
    );
  }
  return NextResponse.json(getSendHistory());
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin authentication required." },
      { status: 401 },
    );
  }
  clearSendHistory();
  return NextResponse.json({ ok: true });
}
