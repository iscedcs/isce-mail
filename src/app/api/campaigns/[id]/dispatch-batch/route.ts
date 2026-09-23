import { NextRequest, NextResponse } from "next/server";
import { runBatchDispatch } from "@/lib/dispatch";
import { checkAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Admin authentication required to dispatch batches." },
      { status: 401 },
    );
  }
  const deadlineAt = Date.now() + 45_000;

  try {
    const body = await req.json().catch(() => ({}));
    const batchNumber = Number(body.batchNumber) || 1;

    // Requeuing rows parked as "failed" or "needs_review" risks a duplicate, so
    // it is opt-in: the History "Send Batch N Now" button asks for it, the
    // send-form's progress loop does not.
    const includeFailed = body.includeFailed === true;

    // "Send Batch N Now" deliberately overrides the schedule; the send form's
    // progress loop must not, or it could push a future batch out early.
    const ignoreSchedule = body.ignoreSchedule === true;

    const outcome = await runBatchDispatch(id, batchNumber, {
      includeFailed,
      ignoreSchedule,
      deadlineAt,
    });

    if (outcome.slices === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Batch ${batchNumber} has no recipients left to dispatch.`,
          result: outcome,
        },
        { status: 400 },
      );
    }

    if (outcome.sent === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            outcome.errors.join("; ") ||
            `Batch ${batchNumber} was not dispatched (0 sent).`,
          result: outcome,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      // `remaining > 0` means the invocation hit its time budget, not that
      // anything failed — call this endpoint again to continue.
      done: outcome.remaining === 0,
      message:
        `Batch ${batchNumber}: ${outcome.sent} sent` +
        (outcome.failed > 0 ? `, ${outcome.failed} failed` : "") +
        (outcome.remaining > 0 ? `, ${outcome.remaining} still queued` : "") +
        ".",
      result: outcome,
    });
  } catch (err: any) {
    console.error("[dispatch-batch] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to dispatch batch." },
      { status: 500 },
    );
  }
}
