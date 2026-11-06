// Task 5, piece 6: account deletion and the nightly purge, tested against a PRODUCTION BUILD on a THROWAWAY database.
// Run by Claude Code. This is NOT my own evidence file: my own captures (a real request, the date moved back, two real
// runs of the job) are evidence 12, 13 and 14.
// The deletion routes are called over HTTP. The purge job is called directly with controlled dates, and the real
// `npm run purge-now` script and the real worker are run as child processes.
// Run: DATABASE_URL=<throwaway> SERVER_LOG=<server log> npx tsx <this file>   (from the project root)
import "../../scripts/loadEnv";
import argon2 from "argon2";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { prisma } from "../../src/lib/db";
import { purgeDeletedAccounts } from "../../src/jobs/purgeDeletedAccounts";
import { DAY_MS } from "../../src/lib/deletionConfig";
import { getBoss, PURGE_QUEUE } from "../../src/lib/queue";

let pass = 0, fail = 0, n = 0;
const check = (label: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Res = { status: number; body: Record<string, unknown>; raw: string; headers: http.IncomingHttpHeaders; setCookie: string[] };
function req(method: string, p: string, opts: { cookie?: string; origin?: string; json?: unknown } = {}) {
  n++;
  const payload = opts.json === undefined ? undefined : JSON.stringify(opts.json);
  const headers: Record<string, string | number> = { Host: "localhost:3077", "X-Forwarded-For": `10.4.${Math.floor(n / 250)}.${n % 250}` };
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.origin) headers.Origin = opts.origin;
  if (payload !== undefined) { headers["Content-Type"] = "application/json"; headers["Content-Length"] = Buffer.byteLength(payload); }
  return new Promise<Res>((resolve, reject) => {
    const r = http.request({ host: "localhost", port: 3077, path: p, method, headers }, (res) => {
      let data = ""; res.on("data", (c) => (data += c));
      res.on("end", () => { let body = {}; try { body = JSON.parse(data); } catch {} resolve({ status: res.statusCode ?? 0, body, raw: data, headers: res.headers, setCookie: (res.headers["set-cookie"] as string[]) ?? [] }); });
    });
    r.on("error", reject); if (payload !== undefined) r.write(payload); r.end();
  });
}

(async () => {
  const PW = "Zq9-delete-kite-7-vault";
  const hash = await argon2.hash(PW, { type: argon2.argon2id });
  const mk = (email: string, name: string, extra: Record<string, unknown> = {}) =>
    prisma.user.create({ data: { email, passwordHash: hash, name, emailVerifiedAt: new Date(), patient: { create: { phone: "08012345678", termsAcceptedAt: new Date() } }, ...extra } as never, include: { patient: true } });
  const login = async (email: string, password = PW) => {
    const r = await req("POST", "/api/login", { json: { email, password } });
    const token = (r.setCookie[0] ?? "").split(";")[0].split("=").slice(1).join("=");
    if (r.status !== 200 || token.length !== 43) throw new Error(`login for ${email} gave ${r.status}: the test cannot go on`);
    return `carepoint_session=${token}`;
  };
  const del = (cookie: string | undefined, password: unknown = PW, origin?: string) => req("POST", "/api/account/delete", { cookie, origin, json: { password } });
  const redirectsToLogin = (r: Res) => r.status >= 300 && r.status < 400 && /\/auth\?mode=login/.test(String(r.headers.location));

  const doctor = await prisma.doctor.create({ data: { name: "Dr Test A", specialty: "General practice" } });
  const admin = await prisma.user.create({ data: { email: "desk@example.com", passwordHash: hash, name: "Desk", role: "admin", emailVerifiedAt: new Date() } });

  // ================= 1. asking to delete =================
  const ann = await mk("ann@example.com", "Ann Realname");
  const bob = await mk("bob@example.com", "Bob Other");
  const annA = await login("ann@example.com"), annB = await login("ann@example.com"), bobA = await login("bob@example.com");

  check("logged out: 401", (await del(undefined)).status === 401);
  const asAdmin = await del(await login("desk@example.com"));
  check("an admin cannot use it: 403 not_a_patient", asAdmin.status === 403 && asAdmin.body.code === "not_a_patient");
  const wrong = await del(annA, "not my password");
  console.log(`  wrong password -> ${wrong.status} ${wrong.raw}`);
  check("a wrong password is refused: 401 wrong_password", wrong.status === 401 && wrong.body.code === "wrong_password");
  check("and nothing changed: still active, both sessions still there", (await prisma.user.findUniqueOrThrow({ where: { id: ann.id } })).status === "active" && (await prisma.session.count({ where: { userId: ann.id } })) === 2);
  const evil = await del(annA, PW, "https://evil.example");
  check("from another site's Origin: 403, nothing changed", evil.status === 403 && (await prisma.user.findUniqueOrThrow({ where: { id: ann.id } })).status === "active");
  check("a missing password: 400", (await req("POST", "/api/account/delete", { cookie: bobA, json: {} })).status === 400);

  const ok = await del(annA);
  console.log(`  correct password -> ${ok.status} ${ok.raw}`);
  check("the right password: 200 with the purge date and the grace period (14 days)", ok.status === 200 && ok.body.graceDays === 14);
  const after = await prisma.user.findUniqueOrThrow({ where: { id: ann.id } });
  check("the account is now pending_deletion, with the request time recorded", after.status === "pending_deletion" && !!after.deletionRequestedAt && Date.now() - after.deletionRequestedAt.getTime() < 60_000);
  const days = (new Date(String(ok.body.purgeAfter)).getTime() - after.deletionRequestedAt!.getTime()) / DAY_MS;
  check("the purge date is exactly 14 days after the request", Math.abs(days - 14) < 0.001, `${days} days`);
  check("NOTHING was erased yet: name, email, phone and password hash are all still there", after.name === "Ann Realname" && after.email === "ann@example.com" && after.passwordHash === hash && (await prisma.patient.findUniqueOrThrow({ where: { userId: ann.id } })).phone === "08012345678");
  check("ALL of the patient's sessions were deleted (2 before, 0 after)", (await prisma.session.count({ where: { userId: ann.id } })) === 0);
  check("another patient's session is untouched", (await prisma.session.count({ where: { userId: bob.id } })) === 1);
  check("the answer clears the browser's cookie", /^carepoint_session=;/.test(ok.setCookie[0] ?? "") && /Max-Age=0/.test(ok.setCookie[0] ?? ""));
  check("both of the patient's old cookies are dead", redirectsToLogin(await req("GET", "/account", { cookie: annA })) && redirectsToLogin(await req("GET", "/account", { cookie: annB })));
  check("the other patient's cookie still works", (await req("GET", "/account", { cookie: bobA })).status === 200);

  // ================= 2. while pending =================
  const annC = await login("ann@example.com");
  check("a pending patient CAN log in (so they can cancel)", annC.startsWith("carepoint_session="));
  const page = await req("GET", "/account", { cookie: annC });
  check("the account page says it is scheduled for deletion, shows a date, and offers 'Cancel the deletion'", page.status === 200 && /scheduled for deletion/.test(page.raw) && /Cancel the deletion/.test(page.raw) && /20\d\d/.test(page.raw));
  check("and does not offer 'Delete my account' again", !/I want to delete my account/.test(page.raw));
  const again = await del(annC);
  check("asking again while pending: 409 already_pending", again.status === 409 && again.body.code === "already_pending");
  const bookPending = await req("POST", "/api/bookings", { cookie: annC, json: { doctorId: doctor.id, date: "2026-12-01", time: "09:30" } });
  check("a pending patient cannot book: 403 deletion_pending", bookPending.status === 403 && bookPending.body.code === "deletion_pending");
  check("cancel from another site's Origin: 403", (await req("POST", "/api/account/delete/cancel", { cookie: annC, origin: "https://evil.example" })).status === 403);
  check("cancel with no login: 401", (await req("POST", "/api/account/delete/cancel")).status === 401);

  // ================= 3. cancelling =================
  const cancel = await req("POST", "/api/account/delete/cancel", { cookie: annC, origin: "http://localhost:3077" });
  const reactivated = await prisma.user.findUniqueOrThrow({ where: { id: ann.id } });
  check("cancelling: 200, the account is active again and the request time is cleared", cancel.status === 200 && reactivated.status === "active" && reactivated.deletionRequestedAt === null);
  check("cancelling when nothing is scheduled: 409 not_pending", (await req("POST", "/api/account/delete/cancel", { cookie: annC })).body.code === "not_pending");
  const bookAgain = await req("POST", "/api/bookings", { cookie: annC, json: { doctorId: doctor.id, date: "2026-12-01", time: "09:30" } });
  check("after cancelling, the patient can book again (201)", bookAgain.status === 201);
  check("the account page offers 'Delete my account' again", /I want to delete my account/.test((await req("GET", "/account", { cookie: annC })).raw));

  // ================= 4. two requests at once, and guessing =================
  const cy = await mk("cy@example.com", "Cy Racer");
  const cyCookie = await login("cy@example.com");
  const race = await Promise.all([del(cyCookie), del(cyCookie), del(cyCookie), del(cyCookie)]);
  const wins = race.filter((r) => r.status === 200).length;
  console.log(`  4 simultaneous requests -> ${race.map((r) => r.status).sort().join(",")}`);
  check("four simultaneous requests: exactly one succeeds", wins === 1);
  check("and the clock was started once (one request time)", (await prisma.user.findUniqueOrThrow({ where: { id: cy.id } })).status === "pending_deletion");

  await mk("guess@example.com", "Guess Target");
  const guessCookie = await login("guess@example.com");
  const guesses: number[] = [];
  for (let i = 0; i < 6; i++) guesses.push((await del(guessCookie, "wrong guess " + i)).status);
  console.log(`  wrong passwords, one after another -> ${guesses.join(",")}`);
  check("wrong passwords share the login limit: 429 after the allowed tries", guesses.slice(-1)[0] === 429 && guesses.filter((s) => s === 401).length >= 3);
  check("and the account is still active", (await prisma.user.findUniqueOrThrow({ where: { email: "guess@example.com" } })).status === "active");

  // ================= 5. the purge job, with controlled dates =================
  const NOW = new Date();
  const ago = (days: number) => new Date(NOW.getTime() - days * DAY_MS);
  const dueOld = await mk("old@example.com", "Olu Delete", { status: "pending_deletion", deletionRequestedAt: ago(15) });
  const dueEdge = await mk("edge@example.com", "Edge Exact", { status: "pending_deletion", deletionRequestedAt: ago(14) });
  const notYet = await mk("recent@example.com", "Rita Recent", { status: "pending_deletion", deletionRequestedAt: ago(13) });
  const stays = await mk("stays@example.com", "Sam Active");
  const adminPending = await prisma.user.create({ data: { email: "oldadmin@example.com", passwordHash: hash, name: "Old Admin", role: "admin", status: "pending_deletion", deletionRequestedAt: ago(30) } });
  const oldCookie = await login("old@example.com");   // a live session for the account about to be purged
  await prisma.emailVerification.create({ data: { userId: dueOld.id, codeHash: "x".repeat(64), expiresAt: ago(-1) } });
  await prisma.emailVerification.create({ data: { userId: dueEdge.id, purpose: "reset", codeHash: "y".repeat(64), expiresAt: ago(-1) } });
  const bkOld = await prisma.booking.create({ data: { patientId: dueOld.patient!.id, doctorId: doctor.id, date: new Date("2026-12-02"), time: "10:00" } });
  const bkEdge = await prisma.booking.create({ data: { patientId: dueEdge.patient!.id, doctorId: doctor.id, date: new Date("2026-12-02"), time: "11:00" } });
  const bkRecent = await prisma.booking.create({ data: { patientId: notYet.patient!.id, doctorId: doctor.id, date: new Date("2026-12-02"), time: "12:00" } });
  const payOld = await prisma.payment.create({ data: { reference: "CP-TEST-OLD", bookingId: bkOld.id, amountKobo: 1250050, status: "paid", method: "cash", paidAt: NOW, recordedById: admin.id } });
  await prisma.paymentEvent.create({ data: { paymentId: payOld.id, oldStatus: null, newStatus: "paid", amountKobo: 1250050, method: "cash", recordedById: admin.id } });
  const payEdge = await prisma.payment.create({ data: { reference: "CP-TEST-EDGE", bookingId: bkEdge.id, amountKobo: 500000, status: "paid", method: "pos", paidAt: NOW, recordedById: admin.id } });

  const lines: string[] = [];
  const first = await purgeDeletedAccounts(NOW, (l) => { lines.push(l); console.log("  " + l); });
  check("the job logs JOB START and JOB END", lines[0]?.startsWith("JOB START purge-deleted-accounts") && lines.at(-1)?.startsWith("JOB END purge-deleted-accounts"));
  check("the END line has the counts: 2 accounts anonymised, 1 session, 2 codes, 2 bookings kept, 2 payments kept", /accounts_anonymised=2 sessions_deleted=1 codes_deleted=2 bookings_kept=2 payments_kept=2 duration_ms=\d+/.test(lines.at(-1) ?? ""));
  check("the log lines hold no name, no email and no id", !/Olu|Edge|example\.com|user=|id=/.test(lines.join(" ")));
  check("the result object agrees (2 due, 2 anonymised)", first.due === 2 && first.anonymised === 2);

  const old2 = await prisma.user.findUniqueOrThrow({ where: { id: dueOld.id }, include: { patient: true } });
  const edge2 = await prisma.user.findUniqueOrThrow({ where: { id: dueEdge.id }, include: { patient: true } });
  check("an account requested 15 days ago is anonymised: placeholder email and name, no password, not verified, status deleted", old2.email === `deleted-${dueOld.id}@deleted.invalid` && old2.name === "Deleted patient" && old2.passwordHash === "!" && old2.emailVerifiedAt === null && old2.status === "deleted");
  check("its phone number is erased", old2.patient?.phone === "");
  check("an account requested EXACTLY 14 days ago is purged too (the boundary counts)", edge2.status === "deleted" && edge2.name === "Deleted patient" && edge2.patient?.phone === "");
  check("each placeholder email is different (the unique rule holds)", old2.email !== edge2.email);
  const recent2 = await prisma.user.findUniqueOrThrow({ where: { id: notYet.id }, include: { patient: true } });
  check("an account requested 13 days ago is NOT touched (name, email, phone, status all as before)", recent2.status === "pending_deletion" && recent2.name === "Rita Recent" && recent2.email === "recent@example.com" && recent2.patient?.phone === "08012345678");
  const stays2 = await prisma.user.findUniqueOrThrow({ where: { id: stays.id } });
  check("an active account is not touched", stays2.status === "active" && stays2.name === "Sam Active");
  const adm2 = await prisma.user.findUniqueOrThrow({ where: { id: adminPending.id } });
  check("a staff account is NEVER purged, even if marked pending 30 days ago", adm2.name === "Old Admin" && adm2.status === "pending_deletion");
  check("its sessions are deleted", (await prisma.session.count({ where: { userId: dueOld.id } })) === 0);
  check("its emailed codes are deleted (verify and reset)", (await prisma.emailVerification.count({ where: { userId: { in: [dueOld.id, dueEdge.id] } } })) === 0);
  check("the original names and emails are in no User row any more", (await prisma.user.count({ where: { OR: [{ email: { in: ["old@example.com", "edge@example.com"] } }, { name: { in: ["Olu Delete", "Edge Exact"] } }] } })) === 0);

  // what is KEPT
  const bkKept = await prisma.booking.findMany({ where: { id: { in: [bkOld.id, bkEdge.id] } }, orderBy: { id: "asc" } });
  check("the bookings are KEPT, still linked to the (now anonymous) patient", bkKept.length === 2 && bkKept[0].patientId === dueOld.patient!.id && bkKept[1].patientId === dueEdge.patient!.id);
  const payKept = await prisma.payment.findMany({ where: { id: { in: [payOld.id, payEdge.id] } }, orderBy: { id: "asc" } });
  check("the payments are KEPT exactly: same references, amounts, methods", payKept.length === 2 && payKept[0].reference === "CP-TEST-OLD" && payKept[0].amountKobo === 1250050 && payKept[0].method === "cash" && payKept[1].amountKobo === 500000 && payKept[1].method === "pos");
  check("the payment history (events) is KEPT", (await prisma.paymentEvent.count({ where: { paymentId: payOld.id } })) === 1);

  // login, register, and a leftover session
  const oldLogin = await req("POST", "/api/login", { json: { email: "old@example.com", password: PW } });
  check("the purged patient can no longer log in with the old email and password (401)", oldLogin.status === 401);
  check("their old cookie is dead", redirectsToLogin(await req("GET", "/account", { cookie: oldCookie })));
  const placeholderLogin = await req("POST", "/api/login", { json: { email: `deleted-${dueOld.id}@deleted.invalid`, password: "!" } });
  check("the placeholder account cannot be logged into either", placeholderLogin.status === 401 || placeholderLogin.status === 400);
  const survivor = "B".repeat(43);
  await prisma.session.create({ data: { userId: dueOld.id, tokenHash: createHash("sha256").update(survivor).digest("hex"), expiresAt: new Date(Date.now() + 3_600_000) } });
  check("even a session row that somehow survived (a real, unexpired one) does not work for a deleted account", redirectsToLogin(await req("GET", "/account", { cookie: `carepoint_session=${survivor}` })));
  const reRegister = await req("POST", "/api/register", { json: { name: "Olu New", email: "old@example.com", phone: "08099990000", password: "Hv4-newer-pine-2-lantern", termsAccepted: true } });
  check("the same email can be registered again afterwards, as a brand new account", reRegister.status === 201 && (await prisma.user.findUniqueOrThrow({ where: { email: "old@example.com" } })).id !== dueOld.id);

  // run it again: nothing more to do
  const snapshot = async () => JSON.stringify(await prisma.user.findMany({ orderBy: { id: "asc" }, select: { id: true, email: true, name: true, status: true, passwordHash: true } }));
  const before = await snapshot();
  const lines2: string[] = [];
  const second = await purgeDeletedAccounts(NOW, (l) => { lines2.push(l); console.log("  " + l); });
  check("running it a SECOND time: 0 accounts anonymised, 0 of everything", second.anonymised === 0 && /accounts_anonymised=0 sessions_deleted=0 codes_deleted=0 bookings_kept=0 payments_kept=0/.test(lines2.at(-1) ?? ""));
  check("and not one user row changed", (await snapshot()) === before);

  // ================= 6. one transaction: all or nothing =================
  const t1 = await mk("t1@example.com", "Trial One", { status: "pending_deletion", deletionRequestedAt: ago(20) });
  const t2 = await mk("t2@example.com", "Trial Two", { status: "pending_deletion", deletionRequestedAt: ago(20) });
  const t1s = await prisma.session.create({ data: { userId: t1.id, tokenHash: "a".repeat(64), expiresAt: new Date(Date.now() + 3_600_000) } });
  // A different user already holds the placeholder email that account t2 would get, so t2's update must fail.
  const blocker = await prisma.user.create({ data: { email: `deleted-${t2.id}@deleted.invalid`, passwordHash: hash, name: "Blocker" } });
  const lines3: string[] = [];
  let threw = false;
  try { await purgeDeletedAccounts(NOW, (l) => { lines3.push(l); console.log("  " + l); }); } catch { threw = true; }
  const t1After = await prisma.user.findUniqueOrThrow({ where: { id: t1.id }, include: { patient: true } });
  check("when the second account fails, the job fails and logs JOB FAILED with nothing_changed=true", threw && /JOB FAILED purge-deleted-accounts nothing_changed=true/.test(lines3.at(-1) ?? ""));
  check("and the FIRST account, which was processed before the failure, is back exactly as it was (one transaction)", t1After.status === "pending_deletion" && t1After.name === "Trial One" && t1After.email === "t1@example.com" && t1After.patient?.phone === "08012345678" && (await prisma.session.count({ where: { id: t1s.id } })) === 1);
  await prisma.user.delete({ where: { id: blocker.id } });
  const retry = await purgeDeletedAccounts(NOW, (l) => console.log("  " + l));
  check("after the cause is removed, the next run purges both", retry.anonymised === 2 && (await prisma.user.count({ where: { id: { in: [t1.id, t2.id] }, status: "deleted" } })) === 2);

  // ================= 7. the real scripts and the real worker =================
  const root = process.cwd();
  const tsx = path.resolve(root, "node_modules/tsx/dist/cli.mjs");
  await mk("pn@example.com", "Purge Now", { status: "pending_deletion", deletionRequestedAt: ago(16) });
  const pn = spawnSync(process.execPath, [tsx, path.resolve(root, "scripts/purge-now.ts")], { encoding: "utf8", env: process.env });
  console.log(`  npm run purge-now -> exit ${pn.status}\n    ${pn.stdout.trim().split("\n").join("\n    ")}`);
  check("the real purge-now script runs the same job: exit 0, JOB START and JOB END, 1 account", pn.status === 0 && /JOB START/.test(pn.stdout) && /JOB END purge-deleted-accounts accounts_anonymised=1 /.test(pn.stdout));

  const wk = await mk("wk@example.com", "Worker Run", { status: "pending_deletion", deletionRequestedAt: ago(18) });
  let workerOut = "";
  const worker = spawn(process.execPath, [tsx, path.resolve(root, "scripts/worker.ts")], { env: process.env });
  worker.stdout.on("data", (d) => (workerOut += d)); worker.stderr.on("data", (d) => (workerOut += d));
  for (let i = 0; i < 40 && !/Worker running/.test(workerOut); i++) await sleep(500);
  check("the real worker starts and says which queues and which schedule it keeps", /Worker running on queues "send-verification-email" and "purge-deleted-accounts" \(purge schedule: 0 2 \* \* \*, Africa\/Lagos\)/.test(workerOut), workerOut.trim().split("\n").at(-1));
  const boss = await getBoss();
  const schedules = await boss.getSchedules(PURGE_QUEUE);
  console.log(`  schedule in PostgreSQL: ${JSON.stringify(schedules.map((s) => ({ name: s.name, cron: s.cron, timezone: s.timezone, missed: s.options?.missed })))}`);
  check("the nightly schedule is stored in PostgreSQL: 02:00, Africa/Lagos, and a missed run is made up once", schedules.length === 1 && schedules[0].cron === "0 2 * * *" && schedules[0].timezone === "Africa/Lagos" && schedules[0].options?.missed === "once");
  await boss.send(PURGE_QUEUE, {});   // what the scheduler does at 02:00
  for (let i = 0; i < 40 && !/JOB END purge-deleted-accounts/.test(workerOut); i++) await sleep(500);
  console.log(`  worker output:\n    ${workerOut.trim().split("\n").join("\n    ")}`);
  check("a job on the purge queue is picked up by the worker, which logs JOB START and JOB END", /JOB START purge-deleted-accounts/.test(workerOut) && /JOB END purge-deleted-accounts accounts_anonymised=1 /.test(workerOut));
  check("and that account is anonymised", (await prisma.user.findUniqueOrThrow({ where: { id: wk.id } })).status === "deleted");
  worker.kill();
  await boss.stop({ graceful: false, close: true }).catch(() => undefined);

  // ================= 8. logs =================
  let log = ""; try { log = readFileSync(process.env.SERVER_LOG as string, "utf8"); } catch {}
  check("the server log has 'Deletion requested: user=… sessions_deleted=2' and 'Deletion cancelled: user=…'", /Deletion requested: user=\d+ sessions_deleted=2/.test(log) && /Deletion cancelled: user=\d+/.test(log));
  check("the server log never holds a name, email, phone number or password", !/Ann Realname|ann@example|08012345678|Zq9-delete/.test(log));

  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
