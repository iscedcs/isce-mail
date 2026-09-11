/**
 * Next.js instrumentation hook.
 * Starts the scheduler ticker on server boot (Node.js runtime only).
 * Fires every 60 seconds to dispatch any due scheduled campaigns.
 */
const globalForScheduler = globalThis as unknown as {
  schedulerStarted?: boolean;
};

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (globalForScheduler.schedulerStarted) {
      return;
    }
    globalForScheduler.schedulerStarted = true;

    const { checkAndRunScheduledCampaigns } = await import(
      "@/lib/scheduler"
    );

    // Initial check on boot
    checkAndRunScheduledCampaigns().catch(console.error);

    // Recurring check every 60 seconds
    setInterval(() => {
      checkAndRunScheduledCampaigns().catch(console.error);
    }, 60_000);

    console.log("[scheduler] Ticker started — checking every 60s");
  }
}
