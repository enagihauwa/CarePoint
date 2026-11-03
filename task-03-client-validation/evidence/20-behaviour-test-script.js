const { chromium } = require("playwright-core");
const BASE = "http://localhost:3077";
let pass = 0, fail = 0;
const check = (label, ok, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };

(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await browser.newPage();
  const errorsInConsole = [];
  page.on("pageerror", (e) => errorsInConsole.push(String(e)));
  await page.goto(`${BASE}/auth?mode=signup`, { waitUntil: "networkidle" });

  const text = (sel) => page.locator(sel).innerText();
  const attr = (sel, a) => page.locator(sel).getAttribute(a);
  const active = (prop) => page.evaluate((p) => document.activeElement && document.activeElement[p], prop);

  check("signup heading", (await text("h1")) === "Create your account");
  check("labels are associated with inputs",
    (await page.getByLabel("Full name").count()) === 1 && (await page.getByLabel("Email address").count()) === 1 &&
    (await page.getByLabel("Phone number").count()) === 1 && (await page.getByLabel("Password", { exact: true }).count()) === 1);
  check("inputs have aria-required", (await attr("#name", "aria-required")) === "true" && (await attr("#terms", "aria-required")) === "true");
  check("no password hint before typing", (await page.locator("#password-hint").count()) === 0);
  check("button is aria-disabled initially", (await attr("button[type=submit]", "aria-disabled")) === "true");
  check("button is NOT the disabled attribute", (await attr("button[type=submit]", "disabled")) === null);

  await page.locator("#name").focus(); await page.locator("#name").blur();
  check("empty name error on blur", (await text("#name-error")).includes("Please enter your full name."));
  check("name aria-invalid after error", (await attr("#name", "aria-invalid")) === "true");
  check("name aria-describedby points at its error slot", ((await attr("#name", "aria-describedby")) || "").includes("name-error"));
  check("error slot is a live region", (await attr("#name-error", "aria-live")) === "polite");
  check("caution icon present with the error", (await page.locator("#name-error svg[aria-hidden=true]").count()) === 1);

  await page.locator("#name").fill("a"); await page.locator("#name").blur();
  check("one-letter name blocked", (await text("#name-error")).includes("between 2 and 100"));
  await page.locator("#name").fill("O'Brien");
  check("valid name clears error", (await text("#name-error")).trim() === "");

  await page.locator("#email").focus(); await page.keyboard.type("a");
  check("email format error appears in real time (no blur)", (await text("#email-error")).includes("name@example.com"));
  await page.locator("#email").fill("patient+care@example.com");
  check("valid email clears the error", (await text("#email-error")).trim() === "");

  await page.locator("#phone").fill("0803"); await page.locator("#phone").blur();
  check("phone fragment blocked", (await text("#phone-error")).includes("Nigerian number"));
  check("phone is type=tel with tel inputmode", (await attr("#phone", "type")) === "tel" && (await attr("#phone", "inputmode")) === "tel");
  await page.locator("#phone").fill("0803 123 4567");
  check("phone with spaces accepted", (await text("#phone-error")).trim() === "");

  await page.locator("#password").focus(); await page.keyboard.type("x");
  check("password hint appears after typing starts", (await page.locator("#password-hint").count()) === 1);
  const described = (await attr("#password", "aria-describedby")) || "";
  check("password aria-describedby links hint and error", described.includes("password-hint") && described.includes("password-error"), described);
  await page.locator("#password").blur();
  check("short password error on blur", (await text("#password-error")).includes("at least 8"));
  await page.getByRole("button", { name: "Show password" }).click();
  check("show password toggle reveals text", (await attr("#password", "type")) === "text");
  await page.getByRole("button", { name: "Hide password" }).click();

  await page.locator("#name").fill("");
  await page.locator("button[type=submit]").click({ force: true });
  const summary = await page.locator("form > div[aria-live=polite]").innerText();
  check("pressing the disabled button explains why", summary.includes("Please fix the problems"), summary.replace(/\s+/g, " ").trim());
  check("focus moves to first problem (name)", (await active("id")) === "name");

  await page.locator("#name").fill("Test Patient");
  await page.locator("#password").fill("correct horse battery");
  await page.locator("button[type=submit]").click({ force: true });
  check("terms-only message", (await page.locator("form > div[aria-live=polite]").innerText()).includes("Please accept the terms before creating your account."));
  check("focus moves to the terms checkbox", (await active("id")) === "terms");
  await page.keyboard.press("Space");
  check("terms checkbox works from the keyboard (Space)", await page.locator("#terms").isChecked());
  check("button no longer aria-disabled when valid", (await attr("button[type=submit]", "aria-disabled")) === null);

  await page.locator("#terms").uncheck();
  await page.locator("#terms").focus(); let reached = false;
  for (let i = 0; i < 4 && !reached; i++) { await page.keyboard.press("Tab"); reached = (await active("type")) === "submit"; }
  check("aria-disabled button is reachable with the Tab key", reached);

  await page.goto(`${BASE}/auth?mode=signup`, { waitUntil: "networkidle" });
  const requests = [];
  page.on("request", (r) => requests.push({ type: r.resourceType(), line: r.method() + " " + r.url().replace(BASE, "") }));
  await page.getByRole("link", { name: "Log in", exact: true }).last().click();
  await page.waitForTimeout(600);
  check("URL changed to ?mode=login", page.url() === `${BASE}/auth?mode=login`, page.url());
  check("login heading shown", (await text("h1")) === "Log in");
  check("document title updated", (await page.title()) === "Log in | CarePoint Clinic", await page.title());
  check("focus moved to the new heading", (await active("tagName")) === "H1");
  const data = requests.filter((r) => ["document", "fetch", "xhr", "script"].includes(r.type));
  check("NO page, data or script requests while switching forms", data.length === 0, data.map((r) => r.line).join(" | ") || "none");
  console.log("      other requests seen while switching (not data requests): " + (requests.filter((r) => !data.includes(r)).map((r) => r.type + " " + r.line).join(" | ") || "none"));

  await page.locator("#email").fill("a@b"); await page.locator("#email").blur();
  check("login: bad email format NOT flagged on blur", (await text("#email-error")).trim() === "");
  await page.locator("#password").fill("x");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  check("login: bad email format flagged on submit", (await text("#email-error")).includes("name@example.com"));
  await page.locator("#email").fill("a@b.com");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  check("login: honest 'not available yet' message (no fake success)", (await page.locator("form").innerText()).includes("Logging in is not available yet"));

  await page.getByRole("link", { name: "Forgot your password?" }).click(); await page.waitForTimeout(400);
  check("reset form shown", (await text("h1")) === "Reset your password" && page.url().endsWith("mode=reset"));
  await page.goBack(); await page.waitForTimeout(500);
  check("browser Back returns to the login form", (await text("h1")) === "Log in" && page.url().endsWith("mode=login"));
  await page.goto(`${BASE}/auth`, { waitUntil: "networkidle" });
  check("no mode shows log in", (await text("h1")) === "Log in");

  await page.goto(`${BASE}/auth?mode=signup`, { waitUntil: "networkidle" });
  await page.locator("#name").fill("Test Patient"); await page.locator("#email").fill("test@example.com");
  await page.locator("#phone").fill("08000000099"); await page.locator("#password").fill("correct horse battery");
  await page.locator("#terms").check();
  const resp = page.waitForResponse((r) => r.url().includes("/api/register"));
  await page.locator("button[type=submit]").click({ force: true });
  const status = (await resp).status();
  await page.waitForTimeout(400);
  const body = await page.locator("main").innerText();
  check("real submit: server answered", [201, 500].includes(status), "status " + status);
  check("real submit: page matches the status (no false success)",
    status === 201 ? body.includes("Your details are saved") : (body.includes("Nothing was saved") && !body.includes("Your details are saved")), "status " + status);

  check("no JavaScript errors on the page", errorsInConsole.length === 0, errorsInConsole.join(" | "));
  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  await browser.close();
})().catch((e) => { console.error("TEST CRASHED:", e.message); process.exit(1); });
