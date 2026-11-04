// Task 4, step 10: the sign-up page's code step, driven in a real browser (Chrome via playwright-core).
// Needs a production build running on :3077 against a THROWAWAY database, and DATABASE_URL set to that database.
// Codes are seeded with the same functions the worker uses; no worker runs and no email is sent.
// Run: DATABASE_URL=<throwaway> SHOT=<png path> node 19b-verify-ui-script.js   (from a folder with playwright-core)
const { chromium } = require("playwright-core");
const { execFileSync } = require("node:child_process");
const BASE = "http://localhost:3077";
let pass = 0, fail = 0;
const check = (label, ok, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };
// Seed a known code for an email, through the repo's own functions.
const seed = (email, code) => execFileSync("npx", ["tsx", "task-04-server-security/evidence/19b-seed-code.ts", email, code], { cwd: process.env.REPO, shell: true, stdio: "pipe" });

(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 700, height: 900 } });
  await page.goto(`${BASE}/auth?mode=signup`, { waitUntil: "networkidle" });
  await page.locator("#name").fill("Ui Test"); await page.locator("#email").fill("  Ui.Test@Example.com ");
  await page.locator("#phone").fill("0803 123 4567"); await page.locator("#password").fill("Zq9-ledger-kite-7-vault-ui");
  await page.locator("#terms").focus(); await page.keyboard.press("Space");
  const reg = page.waitForResponse((r) => r.url().includes("/api/register"));
  await page.locator("button[type=submit]").click();
  check("registration answers 201", (await reg).status() === 201);
  await page.waitForSelector("#code");
  const main = (await page.locator("main").innerText());
  check("the page says which address the code went to (the trimmed address as typed)", main.includes("Ui.Test@Example.com"));
  check("the page tells the patient to check Spam", /Spam/i.test(main));
  check("the page states the 10 minute expiry", /10 minutes/.test(main));
  check("the heading 'Check your email' has focus", (await page.evaluate(() => document.activeElement && document.activeElement.textContent)) === "Check your email");
  check("the old 'Your details are saved' claim is gone", !main.includes("Your details are saved"));
  await page.screenshot({ path: process.env.SHOT.replace(".png", "-code-step.png") });

  // empty / short code: refused in the browser, nothing sent
  let sent = 0; page.on("request", (r) => { if (r.url().includes("/api/verify") && r.method() === "POST") sent++; });
  await page.locator("#code").fill("12 34");
  await page.getByRole("button", { name: "Verify email" }).click();
  check("a short code is refused in the browser with a message, and nothing is sent", (await page.locator("#code-error").innerText()).includes("6-digit") && sent === 0);
  check("focus stays on the code field", (await page.evaluate(() => document.activeElement && document.activeElement.id)) === "code");

  // wrong code: server refuses, message shown under the field, focus returns
  seed("ui.test@example.com", "246810");
  await page.locator("#code").fill("000000");
  const wrong = page.waitForResponse((r) => r.url().includes("/api/verify") && !r.url().includes("resend"));
  await page.getByRole("button", { name: "Verify email" }).click();
  check("a wrong code gets 400", (await wrong).status() === 400);
  await page.waitForTimeout(400);
  check("the message appears under the code field", (await page.locator("#code-error").innerText()).includes("not right"));
  check("focus returns to the code field", (await page.evaluate(() => document.activeElement && document.activeElement.id)) === "code");
  check("it does not claim the email is verified", !(await page.locator("main").innerText()).includes("is verified"));

  // resend
  const rs = page.waitForResponse((r) => r.url().includes("/api/verify/resend"));
  await page.getByRole("button", { name: "Send a new code" }).click();
  check("Send a new code answers 202", (await rs).status() === 202);
  await page.waitForTimeout(300);
  check("the page confirms it, and says to check Spam", /Spam/.test(await page.locator("main").innerText()));
  seed("ui.test@example.com", "135790"); // the new code the worker would have made

  // right code
  await page.locator("#code").fill("135790");
  const right = page.waitForResponse((r) => r.url().includes("/api/verify") && !r.url().includes("resend"));
  await page.getByRole("button", { name: "Verify email" }).click();
  check("the right code gets 200", (await right).status() === 200);
  await page.waitForTimeout(400);
  const done = await page.locator("main").innerText();
  check("the page says the email is verified", done.includes("Your email is verified"));
  check("it does not claim that logging in works", /Logging in is not available yet/.test(done));
  await page.screenshot({ path: process.env.SHOT.replace(".png", "-verified.png") });

  // wrong address: go back keeps what was typed
  await page.goto(`${BASE}/auth?mode=signup`, { waitUntil: "networkidle" });
  await page.locator("#name").fill("Back Test"); await page.locator("#email").fill("back.test@example.com");
  await page.locator("#phone").fill("08031234567"); await page.locator("#password").fill("Zq9-ledger-kite-7-vault-back");
  await page.locator("#terms").focus(); await page.keyboard.press("Space");
  await page.locator("button[type=submit]").click(); await page.waitForSelector("#code");
  await page.getByRole("button", { name: "Go back and fix it" }).click();
  await page.waitForSelector("#email");
  check("'Go back and fix it' returns to the form with the typed values kept", (await page.locator("#email").inputValue()) === "back.test@example.com" && (await page.locator("#name").inputValue()) === "Back Test");

  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  await browser.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e.message); process.exit(1); });
