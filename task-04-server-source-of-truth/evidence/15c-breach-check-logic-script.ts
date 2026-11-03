import { createHash } from "node:crypto";
import { checkBreached, BREACH_RANGE_URL, BREACH_TIMEOUT_MS } from "C:/Users/USER/Desktop/CarePoint/src/lib/breachCheck.ts";

let pass = 0, fail = 0;
const check = (label: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };
const sha1 = (s: string) => createHash("sha1").update(s).digest("hex").toUpperCase();

(async () => {
  // 1. the known test vector: SHA-1("password") starts with 5BAA6
  check("SHA-1 of 'password' is 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8", sha1("password") === "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8");

  // 2. what leaves the machine: record every request
  const seen: { url: string; headers: Record<string, string> }[] = [];
  const secret = "my very private passphrase 2026";
  const full = sha1(secret);
  const fake = (body: string, status = 200) => async (url: string, init: RequestInit) => {
    seen.push({ url, headers: init.headers as Record<string, string> });
    return new Response(body, { status });
  };
  await checkBreached(secret, fake("0000000000000000000000000000000000A:0\n"));
  const sent = seen[0];
  check("the request goes to the range endpoint", sent.url.startsWith(BREACH_RANGE_URL));
  check("only the 5 character prefix is in the address", sent.url === BREACH_RANGE_URL + full.slice(0, 5), sent.url);
  check("the password is NOT in the request", !sent.url.includes("private") && !JSON.stringify(sent).includes("passphrase"));
  check("the other 35 characters of the hash are NOT in the request", !sent.url.includes(full.slice(5, 15)) && !JSON.stringify(sent).includes(full.slice(5)));
  check("the padding header is sent", sent.headers["Add-Padding"] === "true");

  // 3. reading the answer
  const suffix = full.slice(5);
  const breached = await checkBreached(secret, fake(`AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:3\n${suffix}:42\r\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:7`));
  check("a matching suffix with a count is 'breached'", breached.status === "breached" && breached.count === 42, JSON.stringify(breached));
  const padded = await checkBreached(secret, fake(`${suffix}:0\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:5`));
  check("a padding line (count 0) is NOT treated as breached", padded.status === "not_found", JSON.stringify(padded));
  const missing = await checkBreached(secret, fake("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:5\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:9"));
  check("no matching suffix is 'not_found'", missing.status === "not_found");

  // 4. when the service cannot be asked
  const down = await checkBreached(secret, async () => { throw new TypeError("network down"); });
  check("a network error is 'unavailable'", down.status === "unavailable");
  const error500 = await checkBreached(secret, fake("oops", 500));
  check("an HTTP 500 is 'unavailable'", error500.status === "unavailable");
  const limited = await checkBreached(secret, fake("slow down", 429));
  check("an HTTP 429 is 'unavailable'", limited.status === "unavailable");
  const started = Date.now();
  const keepAlive = setTimeout(() => {}, 5000); // a real connection would keep the process alive; the pretend one does not
  const slow = await checkBreached(secret, (_url, init) => new Promise((_resolve, reject) => { (init.signal as AbortSignal).addEventListener("abort", () => reject(new Error("aborted"))); }), 300);
  check("a service that never answers is 'unavailable' after the timeout", slow.status === "unavailable" && Date.now() - started < 1500, `${Date.now() - started} ms`);
  clearTimeout(keepAlive);
  check("the real timeout is 4 seconds", BREACH_TIMEOUT_MS === 4000);

  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
