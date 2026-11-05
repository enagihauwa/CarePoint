// Task 5, piece 2: proxy.ts, the database session check and logout, tested over HTTP against a PRODUCTION BUILD
// on a THROWAWAY database. Run by Claude Code. This is NOT my own evidence file (my own captures, with the
// browser and the blocked network, are the 07 to 10 files).
// Run: DATABASE_URL=<throwaway> SERVER_LOG=<path to the server's log file> npx tsx <this file>
import "../../scripts/loadEnv";
import argon2 from "argon2";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";
import { prisma } from "../../src/lib/db";

let pass = 0, fail = 0, n = 0;
const check = (label: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

type Res = { status: number; body: string; headers: http.IncomingHttpHeaders; setCookie: string[] };
function req(method: string, path: string, opts: { cookie?: string; host?: string; origin?: string; json?: unknown } = {}) {
  n++;
  const payload = opts.json === undefined ? undefined : JSON.stringify(opts.json);
  const headers: Record<string, string | number> = { Host: opts.host ?? "localhost:3077", "X-Forwarded-For": `10.9.${Math.floor(n / 250)}.${n % 250}` };
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.origin) headers.Origin = opts.origin;
  if (payload !== undefined) { headers["Content-Type"] = "application/json"; headers["Content-Length"] = Buffer.byteLength(payload); }
  return new Promise<Res>((resolve, reject) => {
    const r = http.request({ host: "localhost", port: 3077, path, method, headers }, (res) => {
      let data = ""; res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data, headers: res.headers, setCookie: (res.headers["set-cookie"] as string[]) ?? [] }));
    });
    r.on("error", reject); if (payload !== undefined) r.write(payload); r.end();
  });
}
const tokenOf = (setCookie: string) => setCookie.split(";")[0].split("=").slice(1).join("=");
const ck = (token: string) => `carepoint_session=${token}`;
const redirectsToLogin = (r: Res) => (r.status >= 300 && r.status < 400 && /\/auth\?mode=login/.test(String(r.headers.location ?? ""))) || /NEXT_REDIRECT/.test(r.body) && /auth\?mode=login/.test(r.body);

(async () => {
  const pw = "Zq9-session-kite-7-vault";
  const mk = async (email: string, extra: Record<string, unknown> = {}) =>
    prisma.user.create({ data: { email, passwordHash: await argon2.hash(pw, { type: argon2.argon2id }), name: email.split("@")[0], ...extra } as never });
  const patient = await mk("patient@example.com", { emailVerifiedAt: new Date() });
  await mk("unverified@example.com");
  // Each scenario gets its own user, because the login limit is 5 per email per 15 minutes. A login that does not
  // give a 43-character token STOPS the run: a test that carries on with an empty token passes for the wrong reason.
  const login = async (email: string, host?: string) => {
    if (!(await prisma.user.findUnique({ where: { email } }))) await mk(email, { emailVerifiedAt: new Date() });
    const r = await req("POST", "/api/login", { json: { email, password: pw }, host });
    const token = tokenOf(r.setCookie[0] ?? "");
    if (r.status !== 200 || token.length !== 43) throw new Error(`login for ${email} gave ${r.status} and no usable token: the test cannot go on`);
    return { status: r.status, token };
  };

  // 1. the quick check (proxy.ts): no cookie at all
  const none = await req("GET", "/account");
  console.log(`  no cookie        -> ${none.status} Location: ${none.headers.location}`);
  check("no cookie: redirected to the login page by the proxy", none.status >= 300 && none.status < 400 && /\/auth\?mode=login/.test(String(none.headers.location)));
  check("the redirect is a path only, so the browser stays on the host it used", String(none.headers.location).startsWith("/auth"), String(none.headers.location));
  const otherHost = await req("GET", "/account", { host: "carepoint.example" });
  check("the same on another host: still a path only, never a fixed host", String(otherHost.headers.location).startsWith("/auth") && !/localhost/.test(String(otherHost.headers.location)), String(otherHost.headers.location));

  // 2. the real check (database): a cookie that looks right but is not a live session
  const fake = await req("GET", "/account", { cookie: ck("A".repeat(43)) });
  console.log(`  made-up cookie   -> ${fake.status} Location: ${fake.headers.location ?? "(in body)"}`);
  check("a made-up 43-character cookie passes the proxy but the page sends it to login", redirectsToLogin(fake));
  const junk = await req("GET", "/account", { cookie: ck("short") });
  check("a wrong-length cookie is also sent to login", redirectsToLogin(junk));
  check("and neither page shows any account details", !/patient@example\.com/.test(fake.body + junk.body));

  // 3. a real session
  const a = await login("patient@example.com");
  const ok = await req("GET", "/account", { cookie: ck(a.token) });
  check("a live session sees its own account page (200)", ok.status === 200 && /patient@example\.com/.test(ok.body), `status ${ok.status}`);
  check("the page says the email is verified", /Verified/.test(ok.body) && !/Not verified yet/.test(ok.body));
  const un = await login("unverified@example.com");
  const unPage = await req("GET", "/account", { cookie: ck(un.token) });
  check("an unverified account sees 'Not verified yet' and only its own email", /Not verified yet/.test(unPage.body) && /unverified@example\.com/.test(unPage.body) && !/patient@example\.com/.test(unPage.body));

  // 4. expired and revoked
  const row = (token: string) => prisma.session.findUniqueOrThrow({ where: { tokenHash: sha(token) } });
  const e = await login("expired@example.com");
  await prisma.session.update({ where: { tokenHash: sha(e.token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
  check("an expired session (end time one second ago) is sent to login", redirectsToLogin(await req("GET", "/account", { cookie: ck(e.token) })));
  const rv = await login("revoked@example.com");
  await prisma.session.update({ where: { tokenHash: sha(rv.token) }, data: { revokedAt: new Date() } });
  check("a revoked session is sent to login", redirectsToLogin(await req("GET", "/account", { cookie: ck(rv.token) })));

  // 5. lastSeenAt is refreshed only when stale
  const ls = await login("lastseen@example.com");
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  await prisma.session.update({ where: { tokenHash: sha(ls.token) }, data: { lastSeenAt: tenMinAgo } });
  await req("GET", "/account", { cookie: ck(ls.token) });
  const after = (await row(ls.token)).lastSeenAt;
  check("a stale lastSeenAt (10 minutes old) is refreshed by a visit", Date.now() - after.getTime() < 30_000, `${Math.round((Date.now() - after.getTime()) / 1000)} s old`);
  const t1 = after.getTime();
  await req("GET", "/account", { cookie: ck(ls.token) });
  check("a second visit straight away does not write again", (await row(ls.token)).lastSeenAt.getTime() === t1);

  // 6. logout
  const keep = await login("patient@example.com");   // a second, separate session of the same user
  const out = await login("patient@example.com");
  const before = await prisma.session.count({ where: { tokenHash: sha(out.token) } });
  const lo = await req("POST", "/api/logout", { cookie: ck(out.token), origin: "http://localhost:3077" });
  const cleared = lo.setCookie[0] ?? "";
  console.log(`  logout           -> ${lo.status} ${lo.body}  Set-Cookie: ${cleared}`);
  check("the session row existed before logout and is GONE after (deleted, not just hidden)", before === 1 && (await prisma.session.count({ where: { tokenHash: sha(out.token) } })) === 0);
  check("logout answers 200", lo.status === 200);
  check("the cookie is cleared (Max-Age=0) with the same name, Path, HttpOnly and SameSite", /^carepoint_session=;/.test(cleared) && /Max-Age=0/.test(cleared) && /Path=\//.test(cleared) && /HttpOnly/i.test(cleared) && /SameSite=Lax/i.test(cleared));
  check("the OLD token (a stolen copy) no longer works", redirectsToLogin(await req("GET", "/account", { cookie: ck(out.token) })));
  check("another session of the same user is NOT logged out", (await req("GET", "/account", { cookie: ck(keep.token) })).status === 200);
  const again = await req("POST", "/api/logout", { cookie: ck(out.token) });
  check("logging out twice is not an error (200)", again.status === 200);
  const nocookie = await req("POST", "/api/logout");
  check("logging out with no cookie is not an error (200)", nocookie.status === 200);
  const sec = await login("secure@example.com", "carepoint.example");
  const loSecure = await req("POST", "/api/logout", { cookie: ck(sec.token), host: "carepoint.example" });
  check("on a non-localhost host the clearing cookie is Secure too", /;\s*Secure/i.test(loSecure.setCookie[0] ?? ""));

  // 7. the second lock: a logout request from another site is refused and does not log anyone out
  const victim = await login("victim@example.com");
  const evil = await req("POST", "/api/logout", { cookie: ck(victim.token), origin: "https://evil.example" });
  check("a logout from another site's Origin is refused (403)", evil.status === 403);
  check("and it did NOT delete the session", (await prisma.session.count({ where: { tokenHash: sha(victim.token) } })) === 1);

  // 8. the logs
  let log = ""; try { log = readFileSync(process.env.SERVER_LOG as string, "utf8"); } catch {}
  check("the server log has 'Session ended' lines with a hash prefix", /Session ended: rows_deleted=1 hash_prefix=[0-9a-f]{8}/.test(log));
  check("the server log never holds a full token", ![a.token, e.token, out.token, victim.token, keep.token].some((t) => t && log.includes(t)));

  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
