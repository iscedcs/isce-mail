import { NextRequest, NextResponse } from "next/server";
import { dispatchScheduledBatch } from "@/lib/campaign-db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchNumber = Number(body.batchNumber) || 2;

    const result = await dispatchScheduledBatch(params.id, batchNumber);

    return NextResponse.json({
      ok: true,
      message: `Batch ${batchNumber} dispatched (${result.sent} sent).`,
      result,
    });
  } catch (err: any) {
    console.error("[dispatch-batch] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to dispatch batch." },
      { status: 500 },
    );
  }
}
