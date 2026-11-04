
// Task 4, step 10: can the app log in to the mail server? Sends nothing. Needs SMTP_* in .env.
// Node loads .env itself, so the dotenv package is not needed.
try { process.loadEnvFile(); } catch { /* no .env: the variables must already be set */ }
import { verifyEmailConnection } from "../src/lib/email/sendmail";

async function main() {
    try {
        await verifyEmailConnection();
        console.log(`SUCCESS: the app logged in to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} as the configured account.`);
    } catch (error) {
        console.error(`FAILED: could not log in to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}.`);
        // Print the cause, never the credentials. An AggregateError (it tries IPv4 and IPv6) has an
        // empty message, so its inner errors are listed too.
        const e = error as Error & { code?: string; command?: string; response?: string; responseCode?: number; errors?: Error[] };
        console.error("type:", e?.constructor?.name, "| code:", e?.code ?? "none", "| smtp reply code:", e?.responseCode ?? "none");
        if (e?.message) console.error("message:", e.message);
        if (e?.response) console.error("server said:", e.response);
        for (const inner of e?.errors ?? []) console.error("  inner:", (inner as Error & { code?: string }).code, inner.message);
        process.exitCode = 1;
    }
}

main();
