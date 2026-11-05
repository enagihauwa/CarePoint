// Task 5, piece 3: password reset, tested over HTTP against a PRODUCTION BUILD on a THROWAWAY database.
// Run by Claude Code. This is NOT my own evidence file: my own capture (two browsers, one reset, the other
// browser's session dead) is evidence 11.
// The worker's job is run in this process with a FAKE mailer, so the test can read the code the way an inbox
// would. Nothing is emailed. The web routes are the real ones.
// Run: DATABASE_URL=<throwaway> SERVER_LOG=<path to the server's log file> npx tsx <this file>
import "../../scripts/loadEnv";
import argon2 from "argon2";
import { readFileSync } from "node:fs";
import http from "node:http";
import { prisma } from "../../src/lib/db";
import { sendVerificationEmail } from "../../src/jobs/sendVerificationEmail";

let pass = 0, fail = 0, n = 0;
const check = (label: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };

type Res = { status: number; body: Record<string, unknown>; raw: string; headers: http.IncomingHttpHeaders; setCookie: string[] };
function req(method: string, path: string, opts: { cookie?: string; json?: unknown } = {}) {
  n++;
  const payload = opts.json === undefined ? undefined : JSON.stringify(opts.json);
  const headers: Record<string, string | number> = { Host: "localhost:3077", "X-Forwarded-For": `10.7.${Math.floor(n / 250)}.${n % 250}` };
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (payload !== undefined) { headers["Content-Type"] = "application/json"; headers["Content-Length"] = Buffer.byteLength(payload); }
  return new Promise<Res>((resolve, reject) => {
    const r = http.request({ host: "localhost", port: 3077, path, method, headers }, (res) => {
      let data = ""; res.on("data", (c) => (data += c));
      res.on("end", () => { let body = {}; try { body = JSON.parse(data); } catch {} resolve({ status: res.statusCode ?? 0, body, raw: data, headers: res.headers, setCookie: (res.headers["set-cookie"] as string[]) ?? [] }); });
    });
    r.on("error", reject); if (payload !== undefined) r.write(payload); r.end();
  });
}

// The fake mailer: keeps what would have been emailed.
type Sent = { to: string; subject: string; text: string };
const outbox: Sent[] = [];
const fakeMail = (async (m: { to: string; subject: string; text: string }) => { outbox.push({ to: m.to, subject: m.subject, text: m.text }); }) as never;
const lastCode = (to: string) => { const m = [...outbox].reverse().find((o) => o.to === to); return m?.text.match(/is (\d{6})\./)?.[1] ?? ""; };

(async () => {
  const OLD = "Zq9-reset-kite-7-vault", NEW = "Hv4-newer-pine-2-lantern";
  const hash = (p: string) => argon2.hash(p, { type: argon2.argon2id });
  const mk = async (email: string, extra: Record<string, unknown> = {}) =>
    prisma.user.create({ data: { email, passwordHash: await hash(OLD), name: email.split("@")[0], emailVerifiedAt: new Date(), ...extra } as never });
  const login = async (email: string, password = OLD) => {
    const r = await req("POST", "/api/login", { json: { email, password } });
    return { status: r.status, token: (r.setCookie[0] ?? "").split(";")[0].split("=").slice(1).join("="), body: r.body };
  };
  const confirm = (email: string, code: string, password = NEW) => req("POST", "/api/reset/confirm", { json: { email, code, password } });
  const askJob = (userId: number) => sendVerificationEmail({ userId, kind: "reset" }, fakeMail);

  // ---- 1. asking for a reset: the same answer for an account and for no account
  const ada = await mk("ada@example.com");
  const askReal = await req("POST", "/api/reset", { json: { email: "ada@example.com" } });
  const askNone = await req("POST", "/api/reset", { json: { email: "nobody.here@example.com" } });
  console.log(`  ask, real account -> ${askReal.status} ${askReal.raw}`);
  console.log(`  ask, no account   -> ${askNone.status} ${askNone.raw}`);
  check("asking for a reset gives 202 for an account", askReal.status === 202);
  check("and the IDENTICAL status and body for an email with no account", askReal.status === askNone.status && askReal.raw === askNone.raw);
  const queued = async (userId: number) => Number((await prisma.$queryRawUnsafe<{ c: bigint }[]>(`select count(*) as c from pgboss.job where name = 'send-verification-email' and data->>'userId' = '${userId}' and data->>'kind' = 'reset'`))[0].c);
  check("a reset job was queued for the account (kind 'reset')", (await queued(ada.id)) === 1);
  check("and no job was queued for the email with no account", Number((await prisma.$queryRawUnsafe<{ c: bigint }[]>(`select count(*) as c from pgboss.job where data->>'kind' = 'reset'`))[0].c) === 1);
  const badShape = await req("POST", "/api/reset", { json: { email: "not-an-email" } });
  check("a malformed email gets the generic 400", badShape.status === 400);
  check("the old 'not available yet' answer (501) is gone", askReal.status !== 501);

  // ---- 2. the worker's job
  await askJob(ada.id);
  const rowsA = await prisma.emailVerification.findMany({ where: { userId: ada.id } });
  check("the job stored one code with purpose 'reset'", rowsA.length === 1 && rowsA[0].purpose === "reset");
  check("what is stored is a 64-character keyed hash, not the code", /^[0-9a-f]{64}$/.test(rowsA[0].codeHash) && rowsA[0].codeHash !== lastCode("ada@example.com"));
  check("the email went to the account's address with the reset subject", outbox.at(-1)?.to === "ada@example.com" && /password reset code/i.test(outbox.at(-1)?.subject ?? ""));
  check("the email says the password has not changed", /has not changed/.test(outbox.at(-1)?.text ?? ""));
  const life = (rowsA[0].expiresAt.getTime() - Date.now()) / 60000;
  check("the code lives about 10 minutes", life > 9.5 && life <= 10.01, `${life.toFixed(2)} minutes`);
  const placeholder = await prisma.user.create({ data: { email: "unclaimed@example.invalid", passwordHash: "!", name: "Placeholder" } });
  const sentBefore = outbox.length;
  const ph = await askJob(placeholder.id);
  check("the placeholder account (.invalid address) is never mailed", ph.sent === false && outbox.length === sentBefore);
  check("a reset job for a user that does not exist sends nothing", (await askJob(999999)).sent === false && outbox.length === sentBefore);

  // ---- 3. a code works only for its own purpose
  const bea = await mk("bea@example.com", { emailVerifiedAt: null });
  await sendVerificationEmail({ userId: bea.id, kind: "verify" }, fakeMail);
  const verifyCode = lastCode("bea@example.com");
  await askJob(bea.id);
  const resetCode = lastCode("bea@example.com");
  check("two different codes were made for the same user", verifyCode !== "" && resetCode !== "" && verifyCode !== resetCode);
  const crossA = await req("POST", "/api/verify", { json: { email: "bea@example.com", code: resetCode } });
  check("a RESET code does NOT verify an email", crossA.status === 400 && (await prisma.user.findUniqueOrThrow({ where: { id: bea.id } })).emailVerifiedAt === null);
  const crossB = await confirm("bea@example.com", verifyCode);
  check("a VERIFICATION code does NOT reset a password", crossB.status === 400 && (await login("bea@example.com")).status === 200);
  await sendVerificationEmail({ userId: bea.id, kind: "verify" }, fakeMail);
  const resetAlive = await prisma.emailVerification.count({ where: { userId: bea.id, purpose: "reset", usedAt: null } });
  check("asking for a new verification code does NOT cancel a reset code in progress", resetAlive === 1);
  const newestVerify = lastCode("bea@example.com");
  check("the new verification code still verifies", (await req("POST", "/api/verify", { json: { email: "bea@example.com", code: newestVerify } })).status === 200);

  // ---- 4. the happy path, and every session ends
  const cy = await mk("cy@example.com");
  const other = await mk("other@example.com");
  const s1 = await login("cy@example.com"), s2 = await login("cy@example.com"), so = await login("other@example.com");
  const cookie = (t: string) => `carepoint_session=${t}`;
  check("before the reset: two sessions for the user, one for someone else", (await prisma.session.count({ where: { userId: cy.id } })) === 2 && (await prisma.session.count({ where: { userId: other.id } })) === 1);
  check("before the reset: both of the user's cookies open /account", (await req("GET", "/account", { cookie: cookie(s1.token) })).status === 200 && (await req("GET", "/account", { cookie: cookie(s2.token) })).status === 200);
  await askJob(cy.id);
  const code = lastCode("cy@example.com");
  const done = await confirm("cy@example.com", code);
  console.log(`  confirm -> ${done.status} ${done.raw}`);
  check("the right code and a good password: 200", done.status === 200);
  check("EVERY session of the user is gone from the database", (await prisma.session.count({ where: { userId: cy.id } })) === 0);
  check("the other person's session is untouched", (await prisma.session.count({ where: { userId: other.id } })) === 1);
  const dead1 = await req("GET", "/account", { cookie: cookie(s1.token) });
  const dead2 = await req("GET", "/account", { cookie: cookie(s2.token) });
  check("both old cookies now send the visitor to the login page", [dead1, dead2].every((r) => r.status >= 300 && r.status < 400 && /\/auth\?mode=login/.test(String(r.headers.location))));
  check("the other person's cookie still works", (await req("GET", "/account", { cookie: cookie(so.token) })).status === 200);
  check("the OLD password no longer logs in (401)", (await login("cy@example.com", OLD)).status === 401);
  const fresh = await login("cy@example.com", NEW);
  check("the NEW password logs in (200)", fresh.status === 200);
  const stored = (await prisma.user.findUniqueOrThrow({ where: { id: cy.id } })).passwordHash;
  check("the stored password is an Argon2id hash", stored.startsWith("$argon2id$") && await argon2.verify(stored, NEW));
  const again = await confirm("cy@example.com", code, "Another-pw-9-lantern-x");
  check("the same code cannot be used twice", again.status === 400 && (await login("cy@example.com", NEW)).status === 200);

  // ---- 5. failures all look the same
  const dee = await mk("dee@example.com");
  await askJob(dee.id);
  const deeCode = lastCode("dee@example.com");
  const wrongCode = deeCode === "000000" ? "111111" : "000000";
  const wrong = await confirm("dee@example.com", wrongCode);
  const noAccount = await confirm("nobody.here@example.com", wrongCode);
  console.log(`  wrong code     -> ${wrong.status} ${wrong.raw}`);
  console.log(`  no such account-> ${noAccount.status} ${noAccount.raw}`);
  check("a wrong code and an email with no account give the identical status and body", wrong.status === 400 && wrong.raw === noAccount.raw);
  check("a wrong code did not change the password", (await login("dee@example.com", OLD)).status === 200);
  for (let i = 0; i < 4; i++) await confirm("dee@example.com", wrongCode);   // 5 wrong tries in all
  const burned = await confirm("dee@example.com", deeCode);
  check("after 5 wrong tries even the RIGHT code is refused", burned.status === 400 && burned.raw === wrong.raw);
  check("and the password is still the old one", (await login("dee@example.com", OLD)).status === 200);

  const eve = await mk("eve@example.com");
  await askJob(eve.id);
  const eveCode = lastCode("eve@example.com");
  await prisma.emailVerification.updateMany({ where: { userId: eve.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  const expired = await confirm("eve@example.com", eveCode);
  check("an expired code is refused with the same answer", expired.status === 400 && expired.raw === wrong.raw);

  const fay = await mk("fay@example.com");
  await askJob(fay.id); const first = lastCode("fay@example.com");
  await askJob(fay.id); const second = lastCode("fay@example.com");
  check("asking again makes a new code and kills the old one", (first === second) || (await confirm("fay@example.com", first)).status === 400);
  check("the newest code works", (await confirm("fay@example.com", second)).status === 200);

  // ---- 6. the password rules, and a bad password does not spend the code
  const gil = await mk("gil@example.com");
  await askJob(gil.id); const gilCode = lastCode("gil@example.com");
  const weak = await confirm("gil@example.com", gilCode, "short");
  console.log(`  weak password  -> ${weak.status} ${weak.raw}`);
  check("a too-short password is refused with a message about the password", weak.status === 400 && Array.isArray((weak.body.fields as Record<string, unknown> | undefined)?.password));
  const gilRow = await prisma.emailVerification.findFirstOrThrow({ where: { userId: gil.id, purpose: "reset" } });
  check("and the code was NOT used up by it (no try counted, not marked used)", gilRow.attempts === 0 && gilRow.usedAt === null);
  const breached = await confirm("gil@example.com", gilCode, "password123");
  const gilRow2 = await prisma.emailVerification.findFirstOrThrow({ where: { userId: gil.id, purpose: "reset" } });
  if (breached.status === 400 && Array.isArray((breached.body.fields as Record<string, unknown> | undefined)?.password)) {
    check("a password known from breaches is refused, and the code is still unused", gilRow2.attempts === 0 && gilRow2.usedAt === null);
  } else {
    console.log(`  (breach service unavailable or password accepted: status ${breached.status}; this check is skipped, not passed)`);
  }
  const spacey = await confirm("gil@example.com", gilCode, "  spaced new password  ");
  check("after those refusals the same code still works, and spaces in a password are kept", spacey.status === 200 && (await login("gil@example.com", "  spaced new password  ")).status === 200);
  check("a body with the wrong shape is a generic 400", (await req("POST", "/api/reset/confirm", { json: { email: "gil@example.com" } })).status === 400);

  // ---- 7. the limit on choosing a password
  const results: number[] = [];
  for (let i = 0; i < 12; i++) results.push((await confirm("limit@example.com", "000000")).status);
  console.log(`  12 tries for one email -> ${results.join(",")}`);
  check("the per-email limit (10 per 15 minutes) answers 429 from the 11th try", results.slice(0, 10).every((s) => s === 400) && results.slice(10).every((s) => s === 429));

  // ---- 8. the logs
  let log = ""; try { log = readFileSync(process.env.SERVER_LOG as string, "utf8"); } catch {}
  check("the server log has 'Password reset: user=… sessions_deleted=2' for the user with two sessions", new RegExp(`Password reset: user=${cy.id} sessions_deleted=2`).test(log));
  const secrets = [code, deeCode, OLD, NEW, "spaced new password"];
  check("the server log never holds a code or a password", !secrets.some((s) => s && log.includes(s)));
  check("the server log never holds an email address", !/@example\.com/.test(log.replace(/localhost/g, "")));

  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
