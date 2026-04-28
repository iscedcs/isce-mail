import { NextResponse } from "next/server";
import { getSendHistory, clearSendHistory } from "@/lib/send-history";

export async function GET() {
  return NextResponse.json(getSendHistory());
}

export async function DELETE() {
  clearSendHistory();
  return NextResponse.json({ ok: true });
}
