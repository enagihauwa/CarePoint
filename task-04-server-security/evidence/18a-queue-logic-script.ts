// Checks the queue, the job and the worker against a THROWAWAY database, with a FAKE mailer (no email is sent).
// Run: DATABASE_URL=<throwaway db> npx tsx task-04-server-security/evidence/18a-queue-logic-script.ts
try { process.loadEnvFile(); } catch {}
import { prisma } from "../../src/lib/db";
import { sendVerificationEmail, type Mailer } from "../../src/jobs/sendVerificationEmail";
import { getBoss, VERIFICATION_QUEUE, type VerificationJob } from "../../src/lib/queue";
import { codeMatches } from "../../src/lib/verification";
import { Client } from "pg";

let pass = 0, fail = 0;
const check = (label: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sent: { to: string; subject: string; text: string }[] = [];
let failuresLeft = 0;
const fakeMail: Mailer = (async (m: { to: string; subject: string; text: string }) => {
  if (failuresLeft > 0) { failuresLeft--; throw new Error("simulated mail failure"); }
  sent.push(m); return {} as never;
}) as unknown as Mailer;
const codeIn = (text: string) => /\b(\d{6})\b/.exec(text)?.[1] ?? "";

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  const boss = await getBoss();
  const tables = (await db.query(`select table_name from information_schema.tables where table_schema='pgboss' order by 1`)).rows.map((r) => r.table_name);
  check("pg-boss created its own tables in a separate schema called pgboss", tables.includes("job") && tables.includes("queue"), tables.join(", "));
  const publicTables = (await db.query(`select table_name from information_schema.tables where table_schema='public' order by 1`)).rows.map((r) => r.table_name);
  check("my own tables are still in the public schema and untouched", publicTables.includes("User") && !publicTables.includes("job"), publicTables.join(", "));

  const user = await prisma.user.create({ data: { email: "queue.test@example.com", passwordHash: "!", name: "Queue Test", patient: { create: { phone: "08000000000", termsAcceptedAt: new Date() } } } });

  // The worker, exactly as scripts/worker.ts wires it, but with the fake mailer.
  await boss.work<VerificationJob>(VERIFICATION_QUEUE, { pollingIntervalSeconds: 0.5 }, async ([job]) => { await sendVerificationEmail(job.data, fakeMail); });

  // 1. one job -> one email, one stored hash that matches the code in the email
  const id1 = await boss.send(VERIFICATION_QUEUE, { userId: user.id, kind: "verify" } satisfies VerificationJob);
  await sleep(3000);
  const rows1 = await prisma.emailVerification.findMany({ where: { userId: user.id } });
  check("the job ran: exactly one email was handed to the mailer", sent.length === 1, `${sent.length} email(s)`);
  const code1 = codeIn(sent[0]?.text ?? "");
  check("the email contains a 6-digit code", /^\d{6}$/.test(code1));
  check("one verification row is stored, unused, about 10 minutes ahead", rows1.length === 1 && rows1[0].usedAt === null && Math.abs(rows1[0].expiresAt.getTime() - Date.now() - 600_000) < 15_000, `expires in ${Math.round((rows1[0].expiresAt.getTime() - Date.now()) / 1000)} s`);
  check("the stored value is a hash of that code, not the code", rows1[0].codeHash !== code1 && codeMatches(user.id, code1, rows1[0].codeHash));
  const jobRows = (await db.query(`select data from pgboss.job where id = $1`, [id1])).rows;
  check("the job in the queue holds only the user id and the kind, never the code", jobRows.length === 1 && JSON.stringify(Object.keys(jobRows[0].data).sort()) === '["kind","userId"]', JSON.stringify(jobRows[0]?.data));
  const leak = (await db.query(`select count(*)::int as n from pgboss.job where data::text like $1`, [`%${code1}%`])).rows[0].n;
  check("the code appears nowhere in the queue's tables", leak === 0);

  // 2. a second job kills the first code
  await boss.send(VERIFICATION_QUEUE, { userId: user.id, kind: "verify" } satisfies VerificationJob);
  await sleep(3000);
  const rows2 = await prisma.emailVerification.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } });
  check("a second job gives a second code and retires the first", rows2.length === 2 && rows2[0].usedAt !== null && rows2[1].usedAt === null, rows2.map((r) => (r.usedAt ? "used" : "live")).join(", "));

  // 3. retries: the mailer fails twice, then works. A short retry delay is passed for the test only.
  const before = sent.length; failuresLeft = 2;
  const id3 = await boss.send(VERIFICATION_QUEUE, { userId: user.id, kind: "verify" } satisfies VerificationJob, { retryLimit: 3, retryDelay: 1, retryBackoff: false });
  await sleep(9000);
  const state = (await db.query(`select state, retry_count from pgboss.job where id = $1`, [id3])).rows[0];
  check("after two simulated mail failures the job was retried and completed", state?.state === "completed" && state?.retry_count === 2, JSON.stringify(state));
  check("only one email went out in the end", sent.length === before + 1);
  const rows3 = await prisma.emailVerification.findMany({ where: { userId: user.id, usedAt: null } });
  check("only the newest code is live after the retries", rows3.length === 1, `${rows3.length} live code(s)`);
  const liveCode = codeIn(sent[sent.length - 1].text);
  check("and the code in the email that went out is the live one", codeMatches(user.id, liveCode, rows3[0].codeHash));

  // 4. the duplicate-registration notice has no code in it
  const n0 = sent.length;
  const rowsBeforeNotice = await prisma.emailVerification.count({ where: { userId: user.id } });
  await boss.send(VERIFICATION_QUEUE, { userId: user.id, kind: "already_registered" } satisfies VerificationJob);
  await sleep(3000);
  const notice = sent[n0];
  check("the 'someone tried to register' notice was sent", sent.length === n0 + 1 && /tried to create/.test(notice?.text ?? ""));
  check("that notice contains no code", !/\b\d{6}\b/.test(notice?.text ?? ""));
  check("and it did not create a verification row", (await prisma.emailVerification.count({ where: { userId: user.id } })) === rowsBeforeNotice, `${rowsBeforeNotice} rows before and after`);

  // 5. an unknown user does not crash the job
  await boss.send(VERIFICATION_QUEUE, { userId: 999999, kind: "verify" } satisfies VerificationJob);
  await sleep(2500);
  const bad = (await db.query(`select state from pgboss.job where data->>'userId' = '999999'`)).rows[0];
  check("a job for a user that does not exist completes without sending anything", bad?.state === "completed" && sent.length === n0 + 1, JSON.stringify(bad));

  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  await boss.stop({ graceful: true, timeout: 5000 }); await db.end(); await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
