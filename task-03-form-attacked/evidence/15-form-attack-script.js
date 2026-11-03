const { chromium } = require("playwright-core");
const BASE = "http://localhost:3077";

const GOOD = { name: "Attack Test", email: "attack@example.com", phone: "08000000001", password: "correct horse battery" };
const CASES = [
  ["name: one letter", { name: "a" }],
  ["name: only spaces", { name: "   " }],
  ["name: exactly 100 characters", { name: "n".repeat(100) }],
  ["name: 101 characters", { name: "n".repeat(101) }],
  ["name: padded with spaces", { name: "  Padded Name  " }],
  ["name: script tag", { name: "<script>alert(1)</script>" }],
  ["name: digits only", { name: "12345" }],
  ["email: a@b (no dot)", { email: "a@b" }],
  ["email: trailing space", { email: "trailing@example.com " }],
  ["email: valid, first time", { email: "dup@example.com" }],
  ["email: SAME address again", { email: "dup@example.com" }],
  ["phone: letters", { phone: "abc" }],
  ["phone: with spaces and hyphens", { phone: "0803 123-4567" }],
  ["phone: +0000000000 (nonsense international)", { phone: "+0000000000" }],
  ["password: 8 spaces", { password: "        " }],
  ["password: 7 characters", { password: "1234567" }],
  ["password: exactly 64 characters", { password: "p".repeat(64) }],
  ["password: 65 characters", { password: "p".repeat(65) }],
  ["terms: not ticked", { terms: false }],
];

const show = (v) => (v.length > 28 ? `${v.slice(0, 12)}...(${v.length} chars)` : JSON.stringify(v));

(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  console.log("RESULT   | WHAT WAS TYPED INTO THE FORM            | WHAT HAPPENED");
  console.log("---------|-----------------------------------------|--------------------------------------------");
  for (const [label, change] of CASES) {
    const values = { ...GOOD, ...change };
    const page = await browser.newPage();
    await page.goto(`${BASE}/auth?mode=signup`, { waitUntil: "networkidle" });
    await page.locator("#name").fill(values.name);
    await page.locator("#email").fill(values.email);
    await page.locator("#phone").fill(values.phone);
    await page.locator("#password").fill(values.password);
    if (values.terms !== false) { await page.locator("#terms").focus(); await page.keyboard.press("Space"); }
    await page.locator("#name").blur(); await page.locator("#password").blur();
    const blocked = (await page.locator("button[type=submit]").getAttribute("aria-disabled")) === "true";
    const typed = Object.entries(change).filter(([k]) => k !== "terms").map(([k, v]) => `${k}=${show(v)}`).join(" ") || "terms unticked";
    if (blocked) {
      await page.locator("button[type=submit]").click({ force: true });
      const messages = (await page.locator(".auth-error-slot, form > div[aria-live=polite]").allInnerTexts()).map((t) => t.trim()).filter(Boolean);
      console.log(`BLOCKED  | ${label.padEnd(39)} | ${messages[0] || "(no message)"}`);
    } else {
      const resp = page.waitForResponse((r) => r.url().includes("/api/register"));
      await page.locator("button[type=submit]").click();
      const status = (await resp).status();
      console.log(`SENT ${status} | ${label.padEnd(39)} | the form let it through; server answered ${status}`);
    }
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error("CRASH", e.message); process.exit(1); });
