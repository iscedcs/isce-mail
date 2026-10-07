/**
 * Legacy shim for the curriculum send flow.
 *
 * Everything except the `IBasis` type re-export was dead code — the old
 * `sendBulkEmail` / `sendBulkEmailTracked` helpers had no remaining callers
 * since campaigns moved through `createCampaignWithBatches` ->
 * `runBatchDispatch` -> `renderAndSendBatch`. They imported
 * `getResendInstance` / `getSenderAddress` from ../shared, which in turn
 * constructed `new Resend(process.env.*)` at module load — crashing the Vercel
 * build whenever those env vars were missing.
 *
 * The form page at app/(mail-form)/curriculum/page.tsx still imports `IBasis`
 * from here, so this file stays as a thin re-export instead of being deleted
 * outright.
 */
export type { IBasis } from "../shared";
