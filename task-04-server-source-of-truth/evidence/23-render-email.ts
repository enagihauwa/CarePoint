// Renders the verification email to HTML with a SAMPLE code and a PLACEHOLDER expiry. Nothing is sent.
// Run: npx tsx task-04-server-source-of-truth/evidence/23-render-email.ts <output.html>
import { writeFileSync } from "node:fs";
import { verificationEmail } from "../../src/lib/email/verificationEmail";
const { html } = verificationEmail({ name: "Sample Patient", code: "048213", expiresInMinutes: 10 });
writeFileSync(process.argv[2], html);
console.log("wrote", process.argv[2], html.length, "bytes; contains var( ?", html.includes("var("));
