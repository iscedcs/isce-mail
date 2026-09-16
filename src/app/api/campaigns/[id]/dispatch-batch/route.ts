import { NextRequest, NextResponse } from "next/server";
import { dispatchScheduledBatch } from "@/lib/campaign-db";
import { prisma } from "@/lib/prisma";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin authentication required to dispatch batches." },
      { status: 401 },
    );
  }
  try {
    const body = await req.json().catch(() => ({}));
    const batchNumber = Number(body.batchNumber) || 1;

    // Reset any "failed" recipients for this batch back to "scheduled"
    // so a manual retry always works — even if the circuit breaker tripped.
    await prisma.campaignRecipient.updateMany({
      where: {
        campaignId: params.id,
        batchNumber,
        status: "failed",
        resendEmailId: null,
      },
      data: {
        status: "scheduled",
        scheduledFor: new Date(),
      },
    });

    const result = await dispatchScheduledBatch(params.id, batchNumber);

    if (result.sent === 0) {
      return NextResponse.json(
        { ok: false, error: (result as any).message || `Batch ${batchNumber} was not dispatched (0 sent).` },
        { status: 400 },
      );
    }

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
