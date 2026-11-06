// The background worker: takes jobs off the queue and runs them, and keeps the nightly purge scheduled.
// Run in its own terminal: npm run worker   (the website does not need to be running for it to start)
import "./loadEnv"; // must stay the first import (see loadEnv.ts)
import { purgeDeletedAccounts } from "../src/jobs/purgeDeletedAccounts";
import { sendVerificationEmail } from "../src/jobs/sendVerificationEmail";
import { PURGE_CRON, PURGE_TIMEZONE } from "../src/lib/deletionConfig";
import { getBoss, PURGE_QUEUE, VERIFICATION_QUEUE, type VerificationJob } from "../src/lib/queue";

async function main() {
  const boss = await getBoss();

  await boss.work<VerificationJob>(VERIFICATION_QUEUE, async ([job]) => {
    const started = performance.now();
    const result = await sendVerificationEmail(job.data);
    // Log what happened, never the code, the address or the hash.
    console.log(`job ${job.id}: ${result.reason} (${Math.round(performance.now() - started)} ms)`);
  });

  // The nightly purge. The schedule lives in PostgreSQL, so a restart does not lose it, and calling schedule() again
  // with the same name just updates it. missed: "once" means that if the worker was down at the scheduled time, ONE
  // run happens when it comes back (the default would skip it and wait a whole day).
  await boss.createQueue(PURGE_QUEUE, { retryLimit: 2, retryDelay: 300, expireInSeconds: 600, retentionSeconds: 7 * 24 * 3600, deleteAfterSeconds: 14 * 24 * 3600 });
  await boss.schedule(PURGE_QUEUE, PURGE_CRON, null, { tz: PURGE_TIMEZONE, missed: "once" });
  await boss.work(PURGE_QUEUE, async () => {
    await purgeDeletedAccounts();
  });

  console.log(`Worker running on queues "${VERIFICATION_QUEUE}" and "${PURGE_QUEUE}" (purge schedule: ${PURGE_CRON}, ${PURGE_TIMEZONE}). Press Ctrl+C to stop.`);
  const stop = async () => { await boss.stop({ graceful: true }); process.exit(0); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
main().catch((error) => { console.error("Worker failed to start:", error instanceof Error ? error.message : error); process.exit(1); });
