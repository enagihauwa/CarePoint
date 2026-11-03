const { chromium } = require("playwright-core");
const BASE = process.env.BASE || "http://localhost:3077";
const label = process.env.LABEL || "BEFORE";
let found = 0, ok = 0;
const finding = (id, isProblem, text, detail = "") => {
  if (isProblem) found++; else ok++;
  console.log(`${isProblem ? "PROBLEM" : "ok     "}  ${id}  ${text}${detail ? "  [" + detail + "]" : ""}`);
};

(async () => {
  console.log(`# Accessibility checks (${label}) run by Claude Code, headless Chrome, ${BASE}`);
  console.log("# Automated checks of attributes, focus and live regions. NOT a screen-reader test.\n");
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await browser.newPage();
  const active = () => page.evaluate(() => { const e = document.activeElement; return e ? (e.id || e.tagName) : "none"; });

  // ---------- /book ----------
  console.log("## /book (booking form)");
  const html = await (await page.request.get(`${BASE}/book`)).text();
  finding("A0", /role="alert"[^>]*>[^<]*has not finished loading/.test(html),
    "the page's first HTML already contains an alert saying the form has not finished loading (a screen reader may read it on every page load)");

  await page.goto(`${BASE}/book`, { waitUntil: "networkidle" });
  const submit = page.locator("button[type=submit]");

  // empty submit -> server answers 400 with field errors
  const resp = page.waitForResponse((r) => r.url().includes("/api/bookings"));
  await submit.click();
  const status = (await resp).status();
  await page.waitForTimeout(500);
  const errP = page.locator("#name-error");
  const hasErr = (await errP.count()) === 1;
  finding("A1", hasErr && (await errP.evaluate((e) => !e.closest("[aria-live], [role=alert], [role=status]") && !e.getAttribute("aria-live"))),
    "field errors are not in a live region, so a screen reader is not told when they appear", `server status ${status}`);
  finding("A2", hasErr && (await errP.locator("svg").count()) === 0,
    "an error is plain red text with no icon, so it differs from the grey hint text only by colour");
  const afterSubmit = await active();
  finding("A3", afterSubmit !== "name", "after a failed submit, focus is not moved to the first problem", `focus is on: ${afterSubmit}`);

  // button disabled while saving -> focus lost?
  await page.route("**/api/bookings", async (route) => { await new Promise((r) => setTimeout(r, 1200)); await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "test" }) }); });
  await submit.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const whileSaving = await active();
  const disabledAttr = await submit.getAttribute("disabled");
  finding("A4", disabledAttr !== null && whileSaving !== "BUTTON",
    "the submit button uses the disabled attribute while saving, so keyboard focus is dropped from it", `focus while saving: ${whileSaving}, disabled attribute: ${disabledAttr === null ? "no" : "yes"}`);
  await page.waitForTimeout(1500);
  await page.unroute("**/api/bookings");

  // success -> focus and announcement
  await page.route("**/api/bookings", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: 1, doctor: "Dr. Test, Testing", date: "2026-11-06", time: "11:30" }) }));
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#name").fill("Test Patient"); await page.locator("#phone").fill("08000000000");
  await page.locator("#doctorId").selectOption({ index: 1 }); await page.locator("#datetime").fill("2026-11-06T11:30");
  await page.locator("button[type=submit]").focus(); await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  const afterOk = await active();
  const heading = page.locator("#confirmation-title");
  finding("A5", (await heading.count()) === 1 && afterOk !== "confirmation-title",
    "after a successful booking the form is replaced by the confirmation but focus is not moved to it, so keyboard and screen-reader users are left on nothing", `focus is on: ${afterOk}`);
  await page.unroute("**/api/bookings");

  // ---------- /auth?mode=signup ----------
  console.log("\n## /auth?mode=signup (sign-up form)");
  await page.goto(`${BASE}/auth?mode=signup`, { waitUntil: "networkidle" });
  const termsLink = page.locator('a[href="/terms"]');
  const target = await termsLink.getAttribute("target");
  finding("B1", target !== "_blank",
    "the terms link opens in the same tab, so a patient who follows it loses everything they typed", `target attribute: ${target ?? "none"}`);
  finding("B2", (await page.locator("#terms").getAttribute("aria-required")) !== "true", "terms checkbox has no aria-required");
  finding("B3", (await page.locator("button[type=submit]").getAttribute("disabled")) !== null, "sign-up button uses the disabled attribute (it uses aria-disabled)");
  finding("B4", (await page.locator("#name-error").getAttribute("aria-live")) !== "polite", "sign-up error slots are not live regions");

  console.log(`\nsummary: ${found} problem(s) found, ${ok} check(s) ok`);
  await browser.close();
})().catch((e) => { console.error("CRASH", e.message); process.exit(1); });
