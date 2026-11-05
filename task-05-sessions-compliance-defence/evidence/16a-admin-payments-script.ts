// Task 5, piece 5: the admin account, the front-desk page and "record a payment as paid", tested over HTTP against
// a PRODUCTION BUILD on a THROWAWAY database. Run by Claude Code. This is NOT my own evidence file: my own capture
// (the admin recording a payment, a patient getting a 403) is evidence 16.
// The real `npm run create-admin` script is run as a child process, so the only door to an admin account is tested.
// Run: DATABASE_URL=<throwaway> SERVER_LOG=<path to the server's log file> npx tsx <this file>
import "../../scripts/loadEnv";
import argon2 from "argon2";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { prisma } from "../../src/lib/db";

let pass = 0, fail = 0, n = 0;
const check = (label: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };

type Res = { status: number; body: Record<string, unknown>; raw: string; headers: http.IncomingHttpHeaders; setCookie: string[] };
function req(method: string, p: string, opts: { cookie?: string; origin?: string; json?: unknown; rawBody?: string } = {}) {
  n++;
  const payload = opts.rawBody ?? (opts.json === undefined ? undefined : JSON.stringify(opts.json));
  const headers: Record<string, string | number> = { Host: "localhost:3077", "X-Forwarded-For": `10.5.${Math.floor(n / 250)}.${n % 250}` };
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

// The real script, in its own process, with its own environment.
// Run from the project root, so paths start from the current folder.
const tsxCli = path.resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs");
const script = path.resolve(process.cwd(), "scripts/create-admin.ts");
function createAdmin(env: Record<string, string>) {
  const r = spawnSync(process.execPath, [tsxCli, script], { env: { ...process.env, ADMIN_EMAIL: "", ADMIN_PASSWORD: "", ADMIN_NAME: "", ...env }, encoding: "utf8" });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

(async () => {
  const PW = "Zq9-front-desk-kite-7-vault";
  const patientHash = await argon2.hash(PW, { type: argon2.argon2id });
  const mkPatient = (email: string, extra: Record<string, unknown> = {}) =>
    prisma.user.create({ data: { email, passwordHash: patientHash, name: email.split("@")[0], emailVerifiedAt: new Date(), patient: { create: { phone: "08011112222", termsAcceptedAt: new Date() } }, ...extra } as never, include: { patient: true } });

  // ---- 1. the only door to an admin account
  const weak = createAdmin({ ADMIN_EMAIL: "desk@example.com", ADMIN_PASSWORD: "short" });
  check("the script refuses a weak password and creates nothing", weak.code === 1 && (await prisma.user.count({ where: { role: "admin" } })) === 0, weak.out.trim().split("\n")[0]);
  const noEmail = createAdmin({ ADMIN_EMAIL: "", ADMIN_PASSWORD: PW });
  check("the script refuses a missing email", noEmail.code === 1 && (await prisma.user.count()) === 0);
  const made = createAdmin({ ADMIN_EMAIL: "Desk@Example.com", ADMIN_PASSWORD: PW, ADMIN_NAME: "Front Desk" });
  console.log(`  create-admin -> exit ${made.code}: ${made.out.trim()}`);
  const admin = await prisma.user.findUnique({ where: { email: "desk@example.com" }, include: { patient: true } });
  check("a valid run creates one admin (email lower-cased)", made.code === 0 && admin?.role === "admin");
  check("the admin is verified, has no patient profile, and an Argon2id hash", !!admin?.emailVerifiedAt && admin.patient === null && admin.passwordHash.startsWith("$argon2id$"));
  check("the script's output never holds the password or the email", !made.out.includes(PW) && !/desk@example/i.test(made.out));
  const again = createAdmin({ ADMIN_EMAIL: "desk@example.com", ADMIN_PASSWORD: PW });
  check("running it again for the same email refuses", again.code === 1 && (await prisma.user.count({ where: { role: "admin" } })) === 1);
  const victim = await mkPatient("victim@example.com");
  const hijack = createAdmin({ ADMIN_EMAIL: "victim@example.com", ADMIN_PASSWORD: PW });
  check("it will not turn an existing patient into staff", hijack.code === 1 && (await prisma.user.findUniqueOrThrow({ where: { id: victim.id } })).role === "patient");

  // ---- 2. no way to become admin through the website
  const reg = await req("POST", "/api/register", { json: { name: "Sneaky Person", email: "sneaky@example.com", phone: "08033334444", password: "Hv4-newer-pine-2-lantern", termsAccepted: true, role: "admin" } });
  const sneaky = await prisma.user.findUnique({ where: { email: "sneaky@example.com" } });
  check("registering with role:'admin' in the body makes a patient, never staff", reg.status === 201 && sneaky?.role === "patient");

  // ---- logins
  const login = async (email: string) => {
    const r = await req("POST", "/api/login", { json: { email, password: PW } });
    const token = (r.setCookie[0] ?? "").split(";")[0].split("=").slice(1).join("=");
    if (r.status !== 200 || token.length !== 43) throw new Error(`login for ${email} gave ${r.status}: the test cannot go on`);
    return { cookie: `carepoint_session=${token}`, setCookie: r.setCookie[0], body: r.body };
  };
  const ad = await login("desk@example.com");
  check("an admin's session cookie lasts 8 hours (28800 s)", /Max-Age=28800/.test(ad.setCookie));
  check("the login answer tells the page the role is admin", ad.body.role === "admin");

  // ---- data to work with
  const p1 = await mkPatient("pat1@example.com");
  const doctor = await prisma.doctor.create({ data: { name: "Dr Test A", specialty: "General practice" } });
  const mkBooking = (time: string) => prisma.booking.create({ data: { patientId: p1.patient!.id, doctorId: doctor.id, date: new Date("2026-12-01"), time } });
  const bk1 = await mkBooking("09:00"), bk2 = await mkBooking("10:00"), bk3 = await mkBooking("11:00"), bk4 = await mkBooking("12:00");
  const unverified = await mkPatient("unv@example.com", { emailVerifiedAt: null });
  const pt = await login("pat1@example.com");
  const unv = await login("unv@example.com");

  // ---- 3. the page
  const none = await req("GET", "/admin");
  check("/admin with no cookie: redirected to login, asking to come back to /admin", none.status === 307 && /\/auth\?mode=login&next=\/admin/.test(String(none.headers.location)), String(none.headers.location));
  const fake = await req("GET", "/admin", { cookie: "carepoint_session=" + "A".repeat(43) });
  check("/admin with a made-up cookie: also sent to login (the page's own database check)", fake.status >= 300 && fake.status < 400 && /\/auth\?mode=login/.test(String(fake.headers.location)));
  const asPatient = await req("GET", "/admin", { cookie: pt.cookie });
  console.log(`  patient opens /admin -> HTTP ${asPatient.status}`);
  check("a PATIENT opening /admin gets a real HTTP 403", asPatient.status === 403);
  check("the 403 page says so, and holds no booking data (no names, no phone numbers)", /do not have access/.test(asPatient.raw) && !/pat1|08011112222|Dr Test/.test(asPatient.raw));
  const asUnverified = await req("GET", "/admin", { cookie: unv.cookie });
  check("an unverified patient also gets 403", asUnverified.status === 403);
  const asAdmin = await req("GET", "/admin", { cookie: ad.cookie });
  check("the ADMIN sees the page (200) with the bookings, patient names and phone numbers", asAdmin.status === 200 && /Booking \d+/.test(asAdmin.raw) && /pat1/.test(asAdmin.raw) && /08011112222/.test(asAdmin.raw));
  check("an unpaid booking shows 'Not paid yet' and a form", /Not paid yet/.test(asAdmin.raw) && /Record as paid/.test(asAdmin.raw));

  // ---- 4. the API, who may call it
  const pay = (cookie: string | undefined, bookingId: number, extra: Record<string, unknown> = {}, origin?: string) =>
    req("POST", "/api/admin/payments", { cookie, origin, json: { bookingId, amount: "12500.50", method: "cash", ...extra } });
  const out = await pay(undefined, bk1.id);
  check("logged out: 401", out.status === 401 && out.body.code === "login_required");
  const byPatient = await pay(pt.cookie, bk1.id);
  console.log(`  patient calls the API -> ${byPatient.status} ${byPatient.raw}`);
  check("a PATIENT calling the API by hand gets 403 admin_only", byPatient.status === 403 && byPatient.body.code === "admin_only");
  check("and no payment was created by either", (await prisma.payment.count()) === 0);
  const evil = await pay(ad.cookie, bk1.id, {}, "https://evil.example");
  check("the admin's cookie sent from another site's Origin: 403, nothing saved", evil.status === 403 && (await prisma.payment.count()) === 0);

  // ---- 5. recording a payment
  const ok = await pay(ad.cookie, bk1.id, { recordedById: victim.id, status: "pending", paidAt: "2000-01-01" }, "http://localhost:3077");
  console.log(`  admin records -> ${ok.status} ${ok.raw}`);
  check("the admin records a payment: 201", ok.status === 201);
  const p = await prisma.payment.findFirstOrThrow({ where: { bookingId: bk1.id } });
  check("it is stored as paid, by cash, for exactly 1,250,050 kobo (12500.50 naira, no floating point)", p.status === "paid" && p.method === "cash" && p.amountKobo === 1250050);
  check("it is recorded by the logged-in admin, NOT by the id sent in the body", p.recordedById === admin!.id);
  check("paidAt is now, not the date sent in the body", !!p.paidAt && Date.now() - p.paidAt.getTime() < 60_000);
  check("it has a reference like CP-20261105-AB12CD34", /^CP-\d{8}-[0-9A-F]{8}$/.test(p.reference), p.reference);
  const ev = await prisma.paymentEvent.findMany({ where: { paymentId: p.id } });
  check("exactly one PaymentEvent was written: nothing -> paid, with the amount, method and admin", ev.length === 1 && ev[0].oldStatus === null && ev[0].newStatus === "paid" && ev[0].amountKobo === 1250050 && ev[0].method === "cash" && ev[0].recordedById === admin!.id);
  const second = await pay(ad.cookie, bk1.id, { amount: "1" });
  check("recording the same booking again: 409 already_paid", second.status === 409 && second.body.code === "already_paid");
  check("and still ONE payment and ONE event (the second did not overwrite)", (await prisma.payment.count({ where: { bookingId: bk1.id } })) === 1 && (await prisma.paymentEvent.count({ where: { paymentId: p.id } })) === 1 && (await prisma.payment.findUniqueOrThrow({ where: { id: p.id } })).amountKobo === 1250050);

  // ---- many clicks at the same moment. 5 bookings, 12 simultaneous requests each: a lock that is missing shows up
  // here as more than one payment for a booking. (Three requests were too gentle: with the lock REMOVED they still passed.)
  let allOne = true, totals: string[] = [];
  for (let round = 0; round < 5; round++) {
    const target = round === 0 ? bk2 : await mkBooking(`13:${String(round).padStart(2, "0")}`);
    const race = await Promise.all(Array.from({ length: 12 }, () => pay(ad.cookie, target.id)));
    const created = race.filter((r) => r.status === 201).length, refused = race.filter((r) => r.status === 409).length;
    const payments = await prisma.payment.count({ where: { bookingId: target.id } });
    const events = await prisma.paymentEvent.count({ where: { payment: { bookingId: target.id } } });
    totals.push(`${created}x201 ${refused}x409 -> ${payments} payment, ${events} event`);
    if (created !== 1 || refused !== 11 || payments !== 1 || events !== 1) allOne = false;
  }
  console.log(`  12 simultaneous requests x 5 bookings: ${totals.join(" | ")}`);
  check("12 simultaneous requests for one booking, five times over: always exactly one 201, eleven 409, ONE payment and ONE event", allOne);

  // ---- a pending payment is updated, not duplicated
  const pending = await prisma.payment.create({ data: { reference: "CP-PENDING-TEST", bookingId: bk3.id, amountKobo: 500000, status: "pending", recordedById: admin!.id } });
  const upgraded = await pay(ad.cookie, bk3.id, { amount: "5000", method: "transfer" });
  const after = await prisma.payment.findMany({ where: { bookingId: bk3.id } });
  const ev3 = await prisma.paymentEvent.findMany({ where: { paymentId: pending.id } });
  check("a PENDING payment is changed to paid (same row), not duplicated", upgraded.status === 201 && after.length === 1 && after[0].id === pending.id && after[0].status === "paid" && after[0].method === "transfer");
  check("its event says pending -> paid", ev3.length === 1 && ev3[0].oldStatus === "pending" && ev3[0].newStatus === "paid");

  // ---- bad input
  const before = await prisma.payment.count();
  const bad: [string, Res][] = [
    ["amount 0", await pay(ad.cookie, bk4.id, { amount: "0" })],
    ["amount -5", await pay(ad.cookie, bk4.id, { amount: "-5" })],
    ["amount 12.345", await pay(ad.cookie, bk4.id, { amount: "12.345" })],
    ["amount abc", await pay(ad.cookie, bk4.id, { amount: "abc" })],
    ["amount 1e5", await pay(ad.cookie, bk4.id, { amount: "1e5" })],
    ["amount empty", await pay(ad.cookie, bk4.id, { amount: "" })],
    ["amount number not text", await pay(ad.cookie, bk4.id, { amount: 5000 })],
    ["amount over the ceiling", await pay(ad.cookie, bk4.id, { amount: "99999999999" })],
    ["method bitcoin", await pay(ad.cookie, bk4.id, { method: "bitcoin" })],
    ["no method", await pay(ad.cookie, bk4.id, { method: undefined })],
    ["no booking id", await req("POST", "/api/admin/payments", { cookie: ad.cookie, json: { amount: "100", method: "cash" } })],
    ["not json", await req("POST", "/api/admin/payments", { cookie: ad.cookie, rawBody: "not json" })],
  ];
  for (const [label, r] of bad) check(`bad input is refused (400): ${label}`, r.status === 400, String(r.status));
  check("a body over 4 KB: 413", (await req("POST", "/api/admin/payments", { cookie: ad.cookie, json: { bookingId: bk4.id, amount: "1", method: "cash", pad: "x".repeat(5000) } })).status === 413);
  const ghost = await pay(ad.cookie, 999999);
  check("a booking that does not exist: 404", ghost.status === 404 && ghost.body.code === "no_booking");
  check("none of those saved a payment", (await prisma.payment.count()) === before);
  check("a decimal amount in whole naira works too (5000.5 -> 500050 kobo)", (await pay(ad.cookie, bk4.id, { amount: "5000.5", method: "pos" })).status === 201 && (await prisma.payment.findFirstOrThrow({ where: { bookingId: bk4.id } })).amountKobo === 500050);

  // ---- the page after
  const page = await req("GET", "/admin", { cookie: ad.cookie });
  check("the page now shows the payment: amount, method, who recorded it, and the reference", /12,500\.50/.test(page.raw) && /recorded by Front Desk/.test(page.raw) && /CP-\d{8}-/.test(page.raw));
  check("and no payment form is left on a paid booking (4 bookings, all paid: no form at all)", !/Record as paid/.test(page.raw));

  // ---- the log
  let log = ""; try { log = readFileSync(process.env.SERVER_LOG as string, "utf8"); } catch {}
  check("the server log has 'Payment recorded: payment=… booking=… by=…' lines", /Payment recorded: payment=\d+ booking=\d+ by=\d+/.test(log));
  check("the log never holds an amount, a name, an email, a phone number or a password", !/12500|1250050|pat1|desk@|08011112222|Zq9-front/.test(log));

  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
