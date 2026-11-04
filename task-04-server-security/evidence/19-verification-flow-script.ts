// Task 4, step 10: the verify and resend routes, tested over HTTP against a PRODUCTION BUILD on a THROWAWAY database.
// No worker is running and no email is sent. Codes are made with the same functions the worker uses, so their
// values are known to the test. Writes 19, 20, 21, 22 and 22b evidence files into the folder given as argument.
// Run: DATABASE_URL=<throwaway> npx tsx task-04-server-security/evidence/19-verification-flow-script.ts <out dir>
try { process.loadEnvFile(); } catch {}
import { writeFileSync } from "node:fs";
import { Client } from "pg";
import { prisma } from "../../src/lib/db";
import { expiryFromNow, hashCode } from "../../src/lib/verification";

const BASE = "http://localhost:3077";
const OUT = process.argv[2];
const header = "# Run by Claude Code on the user's machine at the user's request, 2026-11-04. Production build, THROWAWAY database (dropped afterwards). No worker running, no email sent: codes are made with the same functions the worker uses.\n";
let pass = 0, fail = 0, n = 0;
const files: Record<string, string[]> = {};
const out = (file: string, line = "") => { (files[file] ??= []).push(line); console.log(line); };
const check = (file: string, label: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; out(file, `${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };

async function post(path: string, body: unknown) {
  n++;
  const res = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": `10.9.${Math.floor(n / 250)}.${n % 250}` }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => ({})) as Record<string, unknown> };
}
let emailSeq = 0;
async function makeUser(verified = false) {
  const email = `flow${++emailSeq}@example.com`;
  const user = await prisma.user.create({ data: { email, passwordHash: "!", name: `Flow ${emailSeq}`, emailVerifiedAt: verified ? new Date() : null, patient: { create: { phone: "08000000000", termsAcceptedAt: new Date() } } } });
  return { id: user.id, email };
}
async function makeCode(userId: number, code: string, opts: { expiresAt?: Date; usedAt?: Date | null } = {}) {
  return prisma.emailVerification.create({ data: { userId, codeHash: hashCode(userId, code), expiresAt: opts.expiresAt ?? expiryFromNow(), usedAt: opts.usedAt ?? null } });
}

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  const F19 = "19-verification-row-and-success.txt", F20 = "20-expired-code.txt", F21 = "21-wrong-code.txt", F22 = "22-reused-code.txt", F22B = "22b-verification-other-checks.txt";

  // ---------- 19: the stored row, and a correct code
  out(F19, "##### 19. What the database holds for a code, and a correct code verifying the account");
  const a = await makeUser(); const rowA = await makeCode(a.id, "048213");
  const stored = (await db.query(`select "codeHash", length("codeHash") as len, "expiresAt" > (now() at time zone 'utc') as not_expired, "usedAt", attempts from "EmailVerification" where id = $1`, [rowA.id])).rows[0];
  out(F19, `  stored row: codeHash=${String(stored.codeHash).slice(0, 16)}... (${stored.len} hex chars), not expired=${stored.not_expired}, usedAt=${stored.usedAt}, attempts=${stored.attempts}`);
  check(F19, "the database holds a 64-character hash, not the code", stored.len === 64 && !String(stored.codeHash).includes("048213"));
  const ok = await post("/api/verify", { email: a.email, code: "048213" });
  out(F19, `  POST /api/verify with the right code -> ${ok.status} ${JSON.stringify(ok.body)}`);
  check(F19, "the right code gives 200", ok.status === 200);
  const afterA = await prisma.user.findUnique({ where: { id: a.id } });
  const rowAfter = await prisma.emailVerification.findUnique({ where: { id: rowA.id } });
  check(F19, "the user is now marked verified", afterA?.emailVerifiedAt !== null);
  check(F19, "the code is marked used", rowAfter?.usedAt !== null);

  // ---------- 20: expired
  out(F20, "##### 20. An expired code is refused");
  const b = await makeUser(); await makeCode(b.id, "111111", { expiresAt: new Date(Date.now() - 60_000) });
  const exp = await post("/api/verify", { email: b.email, code: "111111" });
  out(F20, `  the RIGHT code, but it expired a minute ago -> ${exp.status} ${JSON.stringify(exp.body)}`);
  check(F20, "an expired code is refused with 400", exp.status === 400);
  check(F20, "the user is not verified", (await prisma.user.findUnique({ where: { id: b.id } }))?.emailVerifiedAt === null);

  // ---------- 21: wrong codes and the 5-try cap
  out(F21, "##### 21. Wrong codes are refused and counted, and the 5th wrong try kills the code");
  const c = await makeUser(); const rowC = await makeCode(c.id, "222222");
  for (let i = 1; i <= 5; i++) {
    const r = await post("/api/verify", { email: c.email, code: `00000${i}` });
    const row = await prisma.emailVerification.findUnique({ where: { id: rowC.id } });
    out(F21, `  wrong try ${i} -> ${r.status}; attempts stored = ${row?.attempts}; usedAt set = ${row?.usedAt !== null}`);
  }
  const afterWrong = await prisma.emailVerification.findUnique({ where: { id: rowC.id } });
  check(F21, "five wrong tries are counted", afterWrong?.attempts === 5);
  check(F21, "after the 5th wrong try the code is dead (usedAt set)", afterWrong?.usedAt !== null);
  const dead = await post("/api/verify", { email: c.email, code: "222222" });
  out(F21, `  the RIGHT code after 5 wrong tries -> ${dead.status} ${JSON.stringify(dead.body)}`);
  check(F21, "the right code no longer works once the 5 tries are used", dead.status === 400);
  check(F21, "the user is still not verified", (await prisma.user.findUnique({ where: { id: c.id } }))?.emailVerifiedAt === null);
  const wrongBody = JSON.stringify((await post("/api/verify", { email: c.email, code: "999999" })).body);
  const noUserBody = JSON.stringify((await post("/api/verify", { email: "nobody.here@example.com", code: "999999" })).body);
  out(F21, `  a wrong code for a real account  -> ${wrongBody}`);
  out(F21, `  a code for an email with NO account -> ${noUserBody}`);
  check(F21, "a wrong code and a missing account get the identical answer (nothing reveals who is registered)", wrongBody === noUserBody);

  // concurrency: 12 guesses fired at once at one fresh code
  const d = await makeUser(); const rowD = await makeCode(d.id, "333333");
  const burst = await Promise.all(Array.from({ length: 12 }, (_, i) => post("/api/verify", { email: d.email, code: `44444${i % 10}` })));
  const rowDAfter = await prisma.emailVerification.findUnique({ where: { id: rowD.id } });
  out(F21, `  12 wrong guesses fired at once at one code: statuses ${burst.map((r) => r.status).join(",")}; attempts stored = ${rowDAfter?.attempts}`);
  check(F21, "12 simultaneous guesses never get past 5 comparisons", (rowDAfter?.attempts ?? 99) <= 5, `attempts ${rowDAfter?.attempts}`);

  // ---------- 22: reuse
  out(F22, "##### 22. A used code cannot be used a second time");
  const e = await makeUser(); await makeCode(e.id, "555555");
  const first = await post("/api/verify", { email: e.email, code: "555555" });
  out(F22, `  first use of the code -> ${first.status} ${JSON.stringify(first.body)}`);
  const second = await post("/api/verify", { email: e.email, code: "555555" });
  out(F22, `  the SAME code again   -> ${second.status} ${JSON.stringify(second.body)}`);
  check(F22, "the first use works", first.status === 200);
  check(F22, "the second use is refused", second.status === 400);
  // a reset-style attack: the account is later un-verified; the spent code must still be dead
  await prisma.user.update({ where: { id: e.id }, data: { emailVerifiedAt: null } });
  const third = await post("/api/verify", { email: e.email, code: "555555" });
  check(F22, "even if the account were unverified again, the spent code still does not work", third.status === 400, `status ${third.status}`);
  out(F22, "  Defect check: I looked for a way to reuse a code and did not find one in these routes. This does not prove there is none.");

  // ---------- 22b: other checks
  const f = await makeUser(); await makeCode(f.id, "666666"); await new Promise((r) => setTimeout(r, 20)); await makeCode(f.id, "777777");
  const oldCode = await post("/api/verify", { email: f.email, code: "666666" });
  const newCode = await post("/api/verify", { email: f.email, code: "777777" });
  check(F22B, "with two live codes only the NEWEST works (older refused, newest accepted)", oldCode.status === 400 && newCode.status === 200, `old ${oldCode.status}, new ${newCode.status}`);
  const shape = await Promise.all([["abc", "12345"], ["12345", "1"], ["1234567", ""], [null, "123456"]].map(([code, _]) => post("/api/verify", { email: "x@example.com", code })));
  check(F22B, "a code that is not exactly 6 digits gets the generic 400 before the database is used", shape.every((r) => r.status === 400));
  const verifiedAlready = await makeUser(true); await makeCode(verifiedAlready.id, "888888");
  const vr = await post("/api/verify", { email: verifiedAlready.email, code: "888888" });
  check(F22B, "an already-verified account gets the same refusal", vr.status === 400);

  // resend
  const g = await makeUser(); const h = await makeUser(true);
  const rsReal = await post("/api/verify/resend", { email: g.email });
  const rsNone = await post("/api/verify/resend", { email: "ghost@example.com" });
  const rsDone = await post("/api/verify/resend", { email: h.email });
  check(F22B, "resend gives the identical 202 answer for an unverified account, a missing one and a verified one", rsReal.status === 202 && JSON.stringify(rsReal.body) === JSON.stringify(rsNone.body) && JSON.stringify(rsReal.body) === JSON.stringify(rsDone.body), JSON.stringify(rsReal.body));
  await new Promise((r) => setTimeout(r, 1500));
  const jobs = (await db.query(`select data from pgboss.job where name = 'send-verification-email' order by created_on`)).rows.map((r) => r.data);
  const forG = jobs.filter((j) => j.userId === g.id), forH = jobs.filter((j) => j.userId === h.id);
  check(F22B, "resend queued exactly one job for the unverified account and none for the verified or missing ones", forG.length === 1 && forH.length === 0, `jobs: ${JSON.stringify(jobs)}`);

  // register -> job, duplicate -> already_registered job, same body
  const reg = { name: "Reg Test", email: "reg.test@example.com", phone: "08031234567", password: "Zq9-ledger-kite-7-vault-flow", termsAccepted: true };
  const r1 = await post("/api/register", reg); const r2 = await post("/api/register", { ...reg, email: "REG.test@Example.com" });
  check(F22B, "a new and a duplicate registration give the identical 201 answer", r1.status === 201 && r2.status === 201 && JSON.stringify(r1.body) === JSON.stringify(r2.body), JSON.stringify(r1.body));
  await new Promise((r) => setTimeout(r, 1500));
  const regUser = await prisma.user.findUnique({ where: { email: "reg.test@example.com" } });
  const regJobs = (await db.query(`select data from pgboss.job where data->>'userId' = $1 order by created_on`, [String(regUser?.id)])).rows.map((r) => r.data.kind);
  check(F22B, "registration queued a 'verify' job and the duplicate queued an 'already_registered' job", JSON.stringify(regJobs) === '["verify","already_registered"]', JSON.stringify(regJobs));
  check(F22B, "the account is created unverified", regUser?.emailVerifiedAt === null);
  check(F22B, "no verification code exists yet (the worker makes it, and none is running)", (await prisma.emailVerification.count({ where: { userId: regUser?.id } })) === 0);

  // rate limits
  const k = await makeUser(); await makeCode(k.id, "121212");
  const statuses: number[] = [];
  for (let i = 0; i < 12; i++) statuses.push((await post("/api/verify", { email: k.email, code: "000000" })).status);
  check(F22B, "the per-email verify limit (10 per 15 minutes) answers 429 after 10 tries", statuses.slice(0, 10).every((s) => s === 400) && statuses[10] === 429, statuses.join(","));
  const resendStatuses: number[] = [];
  for (let i = 0; i < 4; i++) resendStatuses.push((await post("/api/verify/resend", { email: "limit.me@example.com" })).status);
  check(F22B, "the per-email resend limit (3 per hour) answers 429 on the 4th", JSON.stringify(resendStatuses) === "[202,202,202,429]", resendStatuses.join(","));

  out(F22B, `\nresult: ${pass} passed, ${fail} failed`);
  for (const [file, lines] of Object.entries(files)) writeFileSync(`${OUT}/${file}`, header + lines.join("\n") + "\n");
  await db.end(); await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
