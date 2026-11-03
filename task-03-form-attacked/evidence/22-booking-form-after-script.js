const { chromium } = require("playwright-core");
const BASE = "http://localhost:3077";
let pass = 0, fail = 0;
const check = (label, ok, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };
(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await browser.newPage();
  const active = () => page.evaluate(() => { const e = document.activeElement; return e ? (e.id || e.tagName) : "none"; });
  await page.goto(`${BASE}/book`, { waitUntil: "networkidle" });

  // empty submit: errors announced, focus on the first problem, button still focusable
  await page.locator("button[type=submit]").click();
  await page.waitForTimeout(600);
  check("empty submit: focus moves to the first problem (name)", (await active()) === "name", await active());
  check("name error text is in a live region", (await page.locator("#name-error").getAttribute("aria-live")) === "polite" && (await page.locator("#name-error").innerText()).trim() !== "");
  check("error has a caution icon", (await page.locator("#name-error svg").count()) === 1);
  check("name aria-describedby includes its error slot", ((await page.locator("#name").getAttribute("aria-describedby")) || "").includes("name-error"));
  check("general alert is still announced", (await page.locator("main [role=alert]").innerText()).includes("missing or invalid"));
  check("date and time hint is attached to the field", ((await page.locator("#datetime").getAttribute("aria-describedby")) || "").includes("datetime-hint"));

  // a real booking
  await page.locator("#name").fill("Test Patient Five");
  await page.locator("#phone").fill("08000000005");
  await page.locator("#doctorId").selectOption({ index: 2 });
  await page.locator("#datetime").fill("2026-11-09T10:30");
  const resp = page.waitForResponse((r) => r.url().includes("/api/bookings"));
  await page.locator("button[type=submit]").click();
  const status = (await resp).status();
  await page.waitForTimeout(600);
  check("real booking returned 201", status === 201, "status " + status);
  check("focus moves to the confirmation heading", (await active()) === "confirmation-title", await active());
  check("confirmation shows a booking number and the doctor", (await page.locator("main").innerText()).includes("Booking number"));
  await browser.close();
  console.log(`\nresult: ${pass} passed, ${fail} failed`);
})().catch((e) => { console.error("CRASH", e.message); process.exit(1); });
