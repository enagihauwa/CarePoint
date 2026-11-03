import { MemoryStore, consume, clientAddress, emailKey, guardAddress, guardEmail } from "C:/Users/USER/Desktop/CarePoint/src/lib/rateLimit.ts";
import { ADDRESS_LIMITS, EMAIL_LIMITS, STORE_MAX_KEYS } from "C:/Users/USER/Desktop/CarePoint/src/lib/rateLimitConfig.ts";

let pass = 0, fail = 0;
const check = (label: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };
const MIN = 60_000;

(async () => {
// 1. the counter, with a fake clock
const store = new MemoryStore();
const limit = EMAIL_LIMITS.login; // 5 per 15 minutes
let t = 1_000_000;
const results: boolean[] = [];
for (let i = 1; i <= 7; i++) results.push(consume(store, "k", limit, t).allowed);
check("first 5 attempts allowed, 6th and 7th refused", JSON.stringify(results) === JSON.stringify([true, true, true, true, true, false, false]), results.join(","));
const refused = consume(store, "k", limit, t) as { allowed: false; retryAfterSeconds: number };
check("Retry-After is within the 15 minute window", refused.retryAfterSeconds > 0 && refused.retryAfterSeconds <= 15 * 60, `${refused.retryAfterSeconds} seconds`);
t += 14 * MIN;
check("still refused 14 minutes later", !consume(store, "k", limit, t).allowed);
const later = consume(store, "k", limit, t + MIN + 1000);
check("allowed again once the window has passed", later.allowed);
check("a different key is not affected", consume(store, "other", limit, 0).allowed);

// 2. the configured numbers
check("login by email is 5 per 15 minutes", EMAIL_LIMITS.login.max === 5 && EMAIL_LIMITS.login.windowMs === 15 * MIN);
check("login by address is 20 per 15 minutes", ADDRESS_LIMITS.login.max === 20 && ADDRESS_LIMITS.login.windowMs === 15 * MIN);
check("reset by email is 3 per hour, by address 10 per hour", EMAIL_LIMITS.reset.max === 3 && ADDRESS_LIMITS.reset.max === 10 && EMAIL_LIMITS.reset.windowMs === 60 * MIN);
check("register by address is 10 per hour", ADDRESS_LIMITS.register.max === 10 && ADDRESS_LIMITS.register.windowMs === 60 * MIN);

// 3. memory stays bounded
const big = new MemoryStore();
for (let i = 0; i < 20_000; i++) consume(big, `login:email:random${i}@example.com`, EMAIL_LIMITS.login, 5000);
check(`20,000 random emails leave at most ${STORE_MAX_KEYS} counters`, big.size <= STORE_MAX_KEYS, `size ${big.size}`);

// 4. keys
const req = (h: Record<string, string>) => new Request("http://x/api/login", { method: "POST", headers: h });
check("address: the last x-forwarded-for value is used", clientAddress(req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })) === "2.2.2.2");
check("address: a missing header becomes 'unknown'", clientAddress(req({})) === "unknown");
check("address: an absurdly long value is cut to 64 characters", clientAddress(req({ "x-forwarded-for": "a".repeat(500) })).length === 64);
check("email key is trimmed and lowercased", emailKey("  Ada@Example.COM ") === "ada@example.com");
check("a missing or non-text email has no key", emailKey(undefined) === null && emailKey(42) === null && emailKey("  ") === null);

// 5. fail closed: a store that throws must give 503, never let the request through
const broken = { hit() { throw new Error("store is down"); } };
const a = guardAddress(req({ "x-forwarded-for": "3.3.3.3" }), performance.now(), "login", broken);
const e = guardEmail(req({}), performance.now(), "login", "a@example.com", broken);
check("address check fails CLOSED with 503", a !== null && a.status === 503, `status ${a?.status}`);
check("email check fails CLOSED with 503", e !== null && e.status === 503, `status ${e?.status}`);
check("503 body does not say why", a !== null && JSON.stringify(await a.json()) === '{"error":"Please try again later."}');

// 6. the refusal itself
const s2 = new MemoryStore();
let last: Response | null = null;
for (let i = 0; i < 21; i++) last = guardAddress(req({ "x-forwarded-for": "4.4.4.4" }), performance.now(), "login", s2);
check("21st request from one address gets 429", last !== null && last.status === 429, `status ${last?.status}`);
check("429 has a Retry-After header", last !== null && Number(last.headers.get("retry-after")) > 0, `Retry-After: ${last?.headers.get("retry-after")}`);
check("429 body is generic", last !== null && JSON.stringify(await last.json()) === '{"error":"Too many attempts. Please try again later."}');

console.log(`\nresult: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
})();
