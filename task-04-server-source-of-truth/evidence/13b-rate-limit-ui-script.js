const { chromium } = require("playwright-core");
const BASE = "http://localhost:3077";
let pass = 0, fail = 0;
const check = (label, ok, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };
(async () => {
  // use up the register limit (10 per hour per address) from this machine with bad requests
  for (let i = 0; i < 10; i++) await fetch(`${BASE}/api/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE}/auth?mode=signup`, { waitUntil: "networkidle" });
  await page.locator("#name").fill("Limited Person"); await page.locator("#email").fill("limited@example.com");
  await page.locator("#phone").fill("08000000007"); await page.locator("#password").fill("correct horse battery");
  await page.locator("#terms").focus(); await page.keyboard.press("Space");
  const resp = page.waitForResponse((r) => r.url().includes("/api/register"));
  await page.locator("button[type=submit]").click();
  const status = (await resp).status();
  await page.waitForTimeout(500);
  const text = await page.locator("main").innerText();
  check("the sign-up request was refused with 429", status === 429, "status " + status);
  check("the page shows the refusal message", text.includes("Too many attempts. Please try again later."));
  check("the page does NOT claim the details were saved", !text.includes("Your details are saved") && !text.includes("Thank you"));
  check("the form is still there to try again later", (await page.locator("#name").count()) === 1);
  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  await browser.close();
})().catch((e) => { console.error("CRASH", e.message); process.exit(1); });
