// Task 4, step 10/11: send ONE real verification email, with a SAMPLE code, to an address you name.
// Usage: npx tsx scripts/send-test-email.ts you@example.com
// The code in it (048213) is made up and is not stored anywhere, so it verifies nothing.
try { process.loadEnvFile(); } catch { /* no .env: the variables must already be set */ }
import { sendEmail } from "../src/lib/email/sendmail";
import { verificationEmail } from "../src/lib/email/verificationEmail";

async function main() {
  const to = process.argv[2];
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("Give one email address: npx tsx scripts/send-test-email.ts you@example.com");
  const { subject, text, html } = verificationEmail({ name: "Test Patient", code: "048213", expiresInMinutes: 10 });
  // The connection to Gmail is intermittent on this network (evidence/16a), so try up to 3 times.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const info = await sendEmail({ to, subject, text, html });
      console.log(`SENT on try ${attempt}: accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)} response="${info.response}"`);
      return;
    } catch (error) {
      const e = error as Error & { code?: string; responseCode?: number };
      console.error(`try ${attempt} failed: ${e.code ?? e.name} ${e.responseCode ?? ""} ${e.message}`.trim());
    }
  }
  process.exitCode = 1;
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
