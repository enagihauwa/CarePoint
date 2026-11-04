// Checks for src/lib/verification.ts. Run: npx tsx task-04-server-source-of-truth/evidence/19a-code-logic-script.ts
try { process.loadEnvFile(); } catch {}
import { generateCode, hashCode, codeMatches, expiryFromNow, CODE_TTL_MINUTES } from "../../src/lib/verification";
let pass = 0, fail = 0;
const check = (label: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };

const N = 200_000, codes = Array.from({ length: N }, generateCode);
check("every code is exactly 6 digits", codes.every((c) => /^\d{6}$/.test(c)));
const leading = codes.filter((c) => c.startsWith("0")).length;
check("codes with a leading zero occur (about 10%), so zero-padding works", leading > N * 0.09 && leading < N * 0.11, `${leading} of ${N} = ${(100 * leading / N).toFixed(2)}%`);
check("the codes are not all the same, and are spread out", new Set(codes).size > 100_000, `${new Set(codes).size} different values in ${N}`);
const perDigit = Array.from({ length: 10 }, (_, d) => codes.filter((c) => c[0] === String(d)).length);
check("the first digit is spread evenly (each digit 9% to 11%)", perDigit.every((n) => n > N * 0.09 && n < N * 0.11), perDigit.join(", "));

const h = hashCode(7, "048213");
check("the hash is 64 hex characters", /^[0-9a-f]{64}$/.test(h));
check("the same user and code always give the same hash", hashCode(7, "048213") === h);
check("the same code for a different user gives a different hash", hashCode(8, "048213") !== h);
check("a different code gives a different hash", hashCode(7, "048214") !== h);
check("the stored hash does not contain the code", !h.includes("048213"));
check("the right code matches", codeMatches(7, "048213", h));
check("a wrong code does not match", !codeMatches(7, "048214", h));
check("the right code for the wrong user does not match", !codeMatches(8, "048213", h));
check("a code with the wrong shape is refused (5 digits, letters, spaces, empty)", ["48213", "04821a", " 048213", "0482130", ""].every((c) => !codeMatches(7, c, h)));
check("a damaged stored hash does not match and does not crash", !codeMatches(7, "048213", "zz") && !codeMatches(7, "048213", ""));

const t0 = new Date("2026-11-04T10:00:00.000Z");
check(`expiry is ${CODE_TTL_MINUTES} minutes after now`, expiryFromNow(t0).toISOString() === "2026-11-04T10:10:00.000Z");

const saved = process.env.VERIFICATION_SECRET;
const hashWithKey = (k: string | undefined) => { process.env.VERIFICATION_SECRET = k; try { return hashCode(7, "048213"); } catch (e) { return "ERR:" + (e as Error).message; } };
check("a different secret gives a different hash", hashWithKey("x".repeat(40)) !== h);
check("a missing secret is refused with a clear error", hashWithKey(undefined).startsWith("ERR:VERIFICATION_SECRET"));
check("a short secret is refused", hashWithKey("short").startsWith("ERR:VERIFICATION_SECRET"));
process.env.VERIFICATION_SECRET = saved;
console.log(`\nresult: ${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
