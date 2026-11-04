// The background worker: takes verification-email jobs off the queue and runs them.
// Run in its own terminal: npm run worker   (the website does not need to be running for it to start)
try { process.loadEnvFile(); } catch { /* no .env: the variables must already be set */ }
import { sendVerificationEmail } from "../src/jobs/sendVerificationEmail";
import { getBoss, VERIFICATION_QUEUE, type VerificationJob } from "../src/lib/queue";

async function main() {
  const boss = await getBoss();
  await boss.work<VerificationJob>(VERIFICATION_QUEUE, async ([job]) => {
    const started = performance.now();
    const result = await sendVerificationEmail(job.data);
    // Log what happened, never the code, the address or the hash.
    console.log(`job ${job.id}: ${result.reason} (${Math.round(performance.now() - started)} ms)`);
  });
  console.log(`Worker running on queue "${VERIFICATION_QUEUE}". Press Ctrl+C to stop.`);
  const stop = async () => { await boss.stop({ graceful: true }); process.exit(0); };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
main().catch((error) => { console.error("Worker failed to start:", error instanceof Error ? error.message : error); process.exit(1); });
