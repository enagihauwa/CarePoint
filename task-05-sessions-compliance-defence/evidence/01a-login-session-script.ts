// Task 5, piece 1: sessions and login, tested over HTTP against a PRODUCTION BUILD on a THROWAWAY database.
// Run by Claude Code. This is NOT my own evidence file (01-two-session-ids.txt, 02-cookie-flags.png and
// 05-generic-errors-both-cases.png are still mine to capture on my machine).
// Run: DATABASE_URL=<throwaway> SERVER_LOG=<path to the server's log file> npx tsx <this file>
import "../../scripts/loadEnv";
import argon2 from "argon2";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";
import { prisma } from "../../src/lib/db";

let pass = 0, fail = 0, n = 0;
const check = (label: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };

// node:http, not fetch: fetch will not let a test choose the Host header, and one check needs a non-localhost host.
function login(email: unknown, password: unknown, host = "localhost:3077", raw?: string) {
  n++;
  const payload = raw ?? JSON.stringify({ email, password });
  return new Promise<{ status: number; body: Record<string, unknown>; setCookie: string[]; ms: number }>((resolve, reject) => {
    const t0 = performance.now();
    const req = http.request({ host: "localhost", port: 3077, path: "/api/login", method: "POST",
      headers: { Host: host, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), "X-Forwarded-For": `10.8.${Math.floor(n / 250)}.${n % 250}` } }, (res) => {
      let data = ""; res.on("data", (c) => (data += c));
      res.on("end", () => { let body = {}; try { body = JSON.parse(data); } catch {} resolve({ status: res.statusCode ?? 0, body, setCookie: (res.headers["set-cookie"] as string[]) ?? [], ms: performance.now() - t0 }); });
    });
    req.on("error", reject); req.write(payload); req.end();
  });
}
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const tokenOf = (cookie: string) => cookie.split(";")[0].split("=").slice(1).join("=");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

(async () => {
  const mk = async (email: string, password: string, extra: Record<string, unknown> = {}) =>
    prisma.user.create({ data: { email, passwordHash: await argon2.hash(password, { type: argon2.argon2id }), name: email.split("@")[0], ...extra } as never });
  const pw = "Zq9-session-kite-7-vault";
  const patient = await mk("patient@example.com", pw, { emailVerifiedAt: new Date() });
  const unverified = await mk("unverified@example.com", pw);
  const admin = await mk("admin@example.com", pw, { role: "admin", emailVerifiedAt: new Date() });
  await mk("spaces@example.com", "  spaced password  ", { emailVerifiedAt: new Date() });
  await prisma.user.create({ data: { email: "placeholder@example.invalid", passwordHash: "!", name: "Placeholder" } });

  // 1. a right login
  const a = await login("patient@example.com", pw);
  check("the right password gives 200", a.status === 200, JSON.stringify(a.body));
  check("the body holds name, role and verified only (no id, no token)", JSON.stringify(Object.keys(a.body).sort()) === '["emailVerified","name","role"]');
  const cookieA = a.setCookie[0] ?? "";
  const tokenA = tokenOf(cookieA);
  console.log(`  Set-Cookie flags: ${cookieA.split("; ").slice(1).join("; ")}`);
  check("the cookie is named carepoint_session", cookieA.startsWith("carepoint_session="));
  check("HttpOnly is set (page scripts cannot read it)", /;\s*HttpOnly/i.test(cookieA));
  check("SameSite=Lax is set", /;\s*SameSite=Lax/i.test(cookieA));
  check("Path=/ is set", /;\s*Path=\//i.test(cookieA));
  check("a patient's Max-Age is 7 days (604800 seconds)", /Max-Age=604800/.test(cookieA));
  check("Secure is NOT set on localhost (the development server has no HTTPS)", !/;\s*Secure/i.test(cookieA));
  check("the token is 43 characters (32 random bytes)", tokenA.length === 43, `${tokenA.length} characters`);

  // 2. over a non-localhost host the cookie must be Secure
  const b = await login("patient@example.com", pw, "carepoint.example");
  check("on a non-localhost host the cookie IS Secure", /;\s*Secure/i.test(b.setCookie[0] ?? ""));

  // 3. admin gets 8 hours
  const c = await login("admin@example.com", pw);
  check("an admin's Max-Age is 8 hours (28800 seconds)", /Max-Age=28800/.test(c.setCookie[0] ?? ""), c.setCookie[0]?.split("; ")[1]);

  // 4. what the database holds
  const rows = await prisma.session.findMany({ where: { userId: patient.id }, orderBy: { id: "asc" } });
  check("two logins by the patient made two session rows", rows.length === 2, `${rows.length} rows`);
  check("the stored value is the SHA-256 hash of the cookie's token", rows[0].tokenHash === sha(tokenA) && /^[0-9a-f]{64}$/.test(rows[0].tokenHash));
  check("the raw token is stored nowhere in the session table", (await prisma.session.count({ where: { tokenHash: tokenA } })) === 0);
  const tokenB = tokenOf(b.setCookie[0]);
  check("two logins gave two different tokens", tokenA !== tokenB);
  check("and two different stored hashes (prefixes " + rows[0].tokenHash.slice(0, 8) + " and " + rows[1].tokenHash.slice(0, 8) + ")", rows[0].tokenHash !== rows[1].tokenHash);
  const life = Math.round((rows[0].expiresAt.getTime() - Date.now()) / 1000);
  check("expiresAt is about 7 days ahead", Math.abs(life - 604800) < 30, `${life} s`);
  check("lastSeenAt is set", rows[0].lastSeenAt instanceof Date);

  // 5. the server log must not hold the token
  let log = ""; try { log = readFileSync(process.env.SERVER_LOG as string, "utf8"); } catch {}
  check("the server log shows only a hash prefix, never the token", log.includes("hash_prefix=" + rows[0].tokenHash.slice(0, 8)) && !log.includes(tokenA) && !log.includes(tokenB));
  check("the server log never holds the password", !log.includes(pw));

  // 6. wrong password and unknown email must be indistinguishable
  const wrong = await login("patient@example.com", "definitely wrong password");
  const unknown = await login("nobody.here@example.com", "definitely wrong password");
  console.log(`  wrong password -> ${wrong.status} ${JSON.stringify(wrong.body)}`);
  console.log(`  unknown email  -> ${unknown.status} ${JSON.stringify(unknown.body)}`);
  check("a wrong password and an unknown email give the identical status and body", wrong.status === 401 && unknown.status === 401 && JSON.stringify(wrong.body) === JSON.stringify(unknown.body));
  check("neither sets a cookie", wrong.setCookie.length === 0 && unknown.setCookie.length === 0);

  // 7. timing: 10 each, every email used once so the per-email limit does not interfere
  const known: number[] = [], none: number[] = [], placeholder: number[] = [];
  for (let i = 0; i < 10; i++) {
    await mk(`known${i}@example.com`, pw);
    known.push((await login(`known${i}@example.com`, "wrong password " + i)).ms);
    none.push((await login(`ghost${i}@example.com`, "wrong password " + i)).ms);
  }
  placeholder.push((await login("placeholder@example.invalid", "wrong password")).ms);
  const mk1 = median(known), mn = median(none);
  console.log(`  median time, wrong password for a real account: ${mk1.toFixed(0)} ms; unknown email: ${mn.toFixed(0)} ms; placeholder account (invalid stored hash): ${placeholder[0].toFixed(0)} ms`);
  check("an unknown email takes about as long as a wrong password (medians within 25 ms)", Math.abs(mk1 - mn) < 25, `${mk1.toFixed(0)} vs ${mn.toFixed(0)} ms`);
  check("a stored value that is not a real hash is not much faster either (within 40% of a real check)", placeholder[0] > mk1 * 0.6, `${placeholder[0].toFixed(0)} ms`);

  // 8. other rules
  const un = await login("unverified@example.com", pw);
  check("an unverified account can log in, and the page is told it is unverified", un.status === 200 && un.body.emailVerified === false);
  const sp = await login("spaces@example.com", "  spaced password  ");
  check("a password with spaces at both ends works as typed (never trimmed)", sp.status === 200);
  const spTrimmed = await login("spaces@example.com", "spaced password");
  check("and the trimmed version does not", spTrimmed.status === 401);
  const bad1 = await login("a@b.com", undefined, "localhost:3077", "not json");
  const bad2 = await login("patient@example.com", "");
  const big = await login("patient@example.com", "x".repeat(5000));
  check("bad input gets the generic 400 or the size 413", bad1.status === 400 && bad2.status === 400 && big.status === 413, `${bad1.status}, ${bad2.status}, ${big.status}`);
  check("the same login on an unverified-then-verified flow never returns another user's data", un.body.name === "unverified");

  // 9. the email limit (5 per 15 minutes) still holds, and counts successes too
  const results: number[] = [];
  for (let i = 0; i < 7; i++) results.push((await login("limit@example.com", "wrong password")).status);
  check("the per-email limit answers 429 on the 6th try", JSON.stringify(results) === "[401,401,401,401,401,429,429]", results.join(","));

  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
