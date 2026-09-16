import { NextRequest, NextResponse } from "next/server";
import { listJobs } from "@/lib/jobs";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin authentication required." },
      { status: 401 },
    );
  }
  return NextResponse.json(listJobs());
}
