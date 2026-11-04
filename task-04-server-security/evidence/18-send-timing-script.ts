// How long does handing one verification email to Gmail take? This is what a registration request would have to
// wait for if the email were sent inside the request instead of in the background job.
// Sends 3 real emails (sample code 048213, verifies nothing) to the address given. Each attempt is timed on its own, failures included.
try { process.loadEnvFile(); } catch {}
import { sendEmail } from "../../src/lib/email/sendmail";
import { verificationEmail } from "../../src/lib/email/verificationEmail";
(async () => {
  const to = process.argv[2];
  const { subject, text, html } = verificationEmail({ name: "Timing Test", code: "048213", expiresInMinutes: 10 });
  for (let i = 1; i <= 3; i++) {
    const t0 = performance.now();
    try { await sendEmail({ to, subject, text, html }); console.log(`  send ${i}: ${Math.round(performance.now() - t0)} ms, accepted`); }
    catch (e) { const err = e as Error & { code?: string }; console.log(`  send ${i}: ${Math.round(performance.now() - t0)} ms, FAILED (${err.code ?? err.name}: ${err.message})`); }
  }
})();
