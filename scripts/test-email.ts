
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
        if (error instanceof Error) {
            console.error(error.message);
        }
        process.exitCode = 1;
    }
}

main();
