import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Deprecated.
 *
 * This endpoint was part of an older job-based send flow that predates
 * `createCampaignWithBatches` / `runBatchDispatch`. Nothing in the current UI
 * posts to it — the history page reads `/api/jobs` for display only. It stayed
 * compiled with imports from `mail-action/<type>/mail.ts`, which in turn transitively
 * instantiated Resend at module load with env vars that were absent in CI and
 * sometimes in Vercel, failing the build.
 *
 * Returning 410 makes the deprecation visible if anything still hits it, while
 * removing every reference to the legacy helpers.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(
    {
      error:
        `This endpoint (/api/jobs/${params.id}/run) has been retired. ` +
        `Send through POST /api/campaigns or POST /api/send/<type> instead.`,
    },
    { status: 410 },
  );
}
