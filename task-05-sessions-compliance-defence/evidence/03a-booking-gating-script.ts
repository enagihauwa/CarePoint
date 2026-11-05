// Task 5, piece 4: booking tied to a logged-in, verified patient, tested over HTTP against a PRODUCTION BUILD
// on a THROWAWAY database. Run by Claude Code. This is NOT my own evidence file: my own captures are 03 (the soft
// flow in my browser) and 04 (hard gating on its branch).
// Run: DATABASE_URL=<throwaway> npx tsx <this file>
import "../../scripts/loadEnv";
import argon2 from "argon2";
import http from "node:http";
import { prisma } from "../../src/lib/db";

let pass = 0, fail = 0, n = 0;
const check = (label: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };

type Res = { status: number; body: Record<string, unknown>; raw: string; setCookie: string[] };
function req(method: string, path: string, opts: { cookie?: string; origin?: string; json?: unknown; rawBody?: string } = {}) {
  n++;
  const payload = opts.rawBody ?? (opts.json === undefined ? undefined : JSON.stringify(opts.json));
  const headers: Record<string, string | number> = { Host: "localhost:3077", "X-Forwarded-For": `10.6.${Math.floor(n / 250)}.${n % 250}` };
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.origin) headers.Origin = opts.origin;
  if (payload !== undefined) { headers["Content-Type"] = "application/json"; headers["Content-Length"] = Buffer.byteLength(payload); }
  return new Promise<Res>((resolve, reject) => {
    const r = http.request({ host: "localhost", port: 3077, path, method, headers }, (res) => {
      let data = ""; res.on("data", (c) => (data += c));
      res.on("end", () => { let body = {}; try { body = JSON.parse(data); } catch {} resolve({ status: res.statusCode ?? 0, body, raw: data, setCookie: (res.headers["set-cookie"] as string[]) ?? [] }); });
    });
    r.on("error", reject); if (payload !== undefined) r.write(payload); r.end();
  });
}

(async () => {
  const pw = "Zq9-booking-kite-7-vault";
  const hash = await argon2.hash(pw, { type: argon2.argon2id });
  const patientUser = (email: string, extra: Record<string, unknown> = {}) =>
    prisma.user.create({ data: { email, passwordHash: hash, name: email.split("@")[0], emailVerifiedAt: new Date(), patient: { create: { phone: "08000000000", termsAcceptedAt: new Date() } }, ...extra } as never, include: { patient: true } });
  const p1 = await patientUser("pat1@example.com");
  const p2 = await patientUser("pat2@example.com");
  await patientUser("unverified@example.com", { emailVerifiedAt: null });
  await prisma.user.create({ data: { email: "admin@example.com", passwordHash: hash, name: "admin", role: "admin", emailVerifiedAt: new Date() } });
  const drA = await prisma.doctor.create({ data: { name: "Dr Test A", specialty: "General practice" } });
  const drB = await prisma.doctor.create({ data: { name: "Dr Test B", specialty: "Paediatrics" } });

  const login = async (email: string) => {
    const r = await req("POST", "/api/login", { json: { email, password: pw } });
    const token = (r.setCookie[0] ?? "").split(";")[0].split("=").slice(1).join("=");
    if (r.status !== 200 || token.length !== 43) throw new Error(`login for ${email} gave ${r.status}: the test cannot go on`);
    return `carepoint_session=${token}`;
  };
  const book = (cookie: string | undefined, extra: Record<string, unknown> = {}, origin?: string) =>
    req("POST", "/api/bookings", { cookie, origin, json: { doctorId: drA.id, date: "2026-12-01", time: "09:30", ...extra } });
  const rows = () => prisma.booking.count();

  // ---- who may book
  const out = await book(undefined);
  console.log(`  logged out      -> ${out.status} ${out.raw}`);
  check("logged out: 401 with code login_required", out.status === 401 && out.body.code === "login_required");
  check("junk cookie: 401 too", (await book("carepoint_session=" + "A".repeat(43))).status === 401);
  check("no booking was saved by either", (await rows()) === 0);

  const cUn = await login("unverified@example.com");
  const un = await book(cUn);
  console.log(`  unverified      -> ${un.status} ${un.raw}`);
  check("an unverified patient: 403 with code verify_required", un.status === 403 && un.body.code === "verify_required");

  const cAdmin = await login("admin@example.com");
  const ad = await book(cAdmin);
  console.log(`  admin           -> ${ad.status} ${ad.raw}`);
  check("a staff account (no patient profile): 403 with code not_a_patient", ad.status === 403 && ad.body.code === "not_a_patient");
  check("still no booking saved", (await rows()) === 0);

  // ---- a patient books
  const c1 = await login("pat1@example.com");
  const ok = await book(c1);
  console.log(`  patient         -> ${ok.status} ${ok.raw}`);
  check("a verified patient: 201", ok.status === 201);
  check("the answer holds booking number, doctor, date and time, and no patient id", ok.body.id !== undefined && /Dr Test A/.test(String(ok.body.doctor)) && ok.body.date === "2026-12-01" && ok.body.time === "09:30" && !("patientId" in ok.body));
  const saved = await prisma.booking.findUniqueOrThrow({ where: { id: ok.body.id as number } });
  check("the booking belongs to the logged-in patient, from the session", saved.patientId === p1.patient!.id);

  // ---- the client cannot choose who is booking
  const forged = await book(c1, { patientId: p2.patient!.id, userId: p2.id, name: "Someone Else", phone: "09099999999", time: "10:00" });
  const forgedRow = await prisma.booking.findFirstOrThrow({ where: { time: "10:00" } });
  check("a body naming ANOTHER patient is ignored: the booking is still the logged-in patient's", forged.status === 201 && forgedRow.patientId === p1.patient!.id);

  // ---- slots
  const c2 = await login("pat2@example.com");
  const taken = await book(c2);
  console.log(`  same slot again -> ${taken.status} ${taken.raw}`);
  check("the same doctor, date and time, by another patient: 409 slot_taken", taken.status === 409 && taken.body.code === "slot_taken");
  check("and only ONE booking exists for that slot", (await prisma.booking.count({ where: { doctorId: drA.id, time: "09:30" } })) === 1);
  check("another doctor at that time is fine (201)", (await book(c2, { doctorId: drB.id })).status === 201);
  check("the same doctor at another time is fine (201)", (await book(c2, { time: "11:00" })).status === 201);

  // ---- validation
  const before = await rows();
  const badDoctor = await book(c1, { doctorId: 99999 });
  const badDate = await book(c1, { date: "2026-13-45" });
  const badTime = await book(c1, { time: "25:99" });
  const noFields = await req("POST", "/api/bookings", { cookie: c1, json: {} });
  const notJson = await req("POST", "/api/bookings", { cookie: c1, rawBody: "not json" });
  const huge = await req("POST", "/api/bookings", { cookie: c1, json: { doctorId: drA.id, date: "2026-12-02", time: "09:00", pad: "x".repeat(5000) } });
  console.log(`  bad doctor ${badDoctor.status}, date ${badDate.status}, time ${badTime.status}, no fields ${noFields.status}, not json ${notJson.status}, huge ${huge.status}`);
  check("a doctor that does not exist: 400 with a message on doctorId", badDoctor.status === 400 && Array.isArray((badDoctor.body.fields as Record<string, unknown>)?.doctorId));
  check("an impossible date: 400 with a message on date", badDate.status === 400 && Array.isArray((badDate.body.fields as Record<string, unknown>)?.date));
  check("an impossible time: 400 with a message on time", badTime.status === 400 && Array.isArray((badTime.body.fields as Record<string, unknown>)?.time));
  check("an empty body: 400", noFields.status === 400);
  check("a body that is not JSON: 400", notJson.status === 400);
  check("a body over 4 KB: 413", huge.status === 413);
  check("none of those saved anything", (await rows()) === before);

  // ---- the second lock, and sessions that have ended
  const evil = await book(c1, { time: "12:00" }, "https://evil.example");
  check("a booking from another site's Origin: 403, nothing saved", evil.status === 403 && (await prisma.booking.count({ where: { time: "12:00" } })) === 0);
  const own = await book(c1, { time: "12:30" }, "http://localhost:3077");
  check("a booking from this site's own Origin works (201)", own.status === 201);

  const c3 = await login("pat1@example.com");
  await req("POST", "/api/logout", { cookie: c3, origin: "http://localhost:3077" });
  check("after logging out, the old cookie cannot book (401)", (await book(c3, { time: "13:00" })).status === 401);
  const c4 = await login("pat1@example.com");
  await prisma.session.updateMany({ where: { user: { email: "pat1@example.com" }, tokenHash: { not: "" } }, data: { expiresAt: new Date(Date.now() - 1000) } });
  check("an expired session cannot book (401)", (await book(c4, { time: "13:30" })).status === 401);

  // ---- the pages
  const pageOut = await req("GET", "/book");
  check("/book is public: a visitor with no cookie sees it (200)", pageOut.status === 200);
  check("a logged-out visitor is told they will be asked to log in when they confirm", /log in or create an account when you confirm/.test(pageOut.raw));
  check("the form no longer asks for a name or phone number", !/id="phone"/.test(pageOut.raw) && !/id="name"/.test(pageOut.raw));
  const c5 = await login("pat2@example.com");
  const pageIn = await req("GET", "/book", { cookie: c5 });
  check("a logged-in patient sees 'Booking as <their name>'", /Booking as/.test(pageIn.raw) && /pat2/.test(pageIn.raw));

  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
