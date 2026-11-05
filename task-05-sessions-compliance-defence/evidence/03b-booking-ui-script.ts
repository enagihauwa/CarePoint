// Task 5, piece 4: the browser side of soft gating, tested in a real headless Chrome against a PRODUCTION BUILD
// on a THROWAWAY database. Run by Claude Code. This is NOT my own evidence file (03 and 04 are mine, from my browser).
// playwright-core is NOT a dependency of this project (it is kept outside the repo), so its folder is passed in:
// Run: DATABASE_URL=<throwaway> PLAYWRIGHT_CORE=<path to playwright-core> npx tsx <this file>
import "../../scripts/loadEnv";
import argon2 from "argon2";
import { createRequire } from "node:module";
import { prisma } from "../../src/lib/db";
import { sendVerificationEmail } from "../../src/jobs/sendVerificationEmail";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE as string);
const BASE = "http://localhost:3077";

let pass = 0, fail = 0;
const check = (label: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };

(async () => {
  const pw = "Zq9-booking-kite-7-vault";
  const hash = await argon2.hash(pw, { type: argon2.argon2id });
  const mk = (email: string, verified: boolean) => prisma.user.create({ data: { email, passwordHash: hash, name: email.split("@")[0], emailVerifiedAt: verified ? new Date() : null, patient: { create: { phone: "08000000000", termsAcceptedAt: new Date() } } } });
  const verified = await mk("verified@example.com", true);
  const unverified = await mk("notyet@example.com", false);
  await prisma.doctor.create({ data: { name: "Dr Test A", specialty: "General practice" } });

  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const logIn = async (email: string) => {
    await page.fill("#email", email);
    await page.fill("#password", pw);
    await page.click('button[type="submit"]');
  };

  // ---- 1. a visitor chooses, then is asked to log in, and the choice is kept
  await page.goto(`${BASE}/book`);
  await page.waitForSelector("#doctorId");
  await page.waitForFunction(() => !(document.querySelector('button[type="submit"]') as HTMLButtonElement).disabled);
  await page.selectOption("#doctorId", { index: 1 });
  const chosenDoctor = await page.inputValue("#doctorId");
  await page.fill("#datetime", "2026-12-05T10:15");
  await page.click('button[type="submit"]');
  await page.waitForSelector('form [role="alert"]');
  const alertText = await page.innerText('form [role="alert"]');
  console.log(`  logged-out submit -> "${alertText.replace(/\s+/g, " ")}"`);
  check("a logged-out visitor who confirms is asked to log in or create an account", /Log in or create an account to confirm/.test(alertText) && /We kept your choices/.test(alertText));
  check("the message links to the login page with ?next=/book", (await page.locator('a[href="/auth?mode=login&next=/book"]').count()) === 1);
  const draft = await page.evaluate(() => sessionStorage.getItem("carepoint_booking_draft"));
  console.log(`  draft kept in this tab: ${draft}`);
  check("only the doctor and the time are kept in the browser, nothing personal", JSON.parse(draft ?? "{}").doctorId === chosenDoctor && JSON.parse(draft ?? "{}").datetime === "2026-12-05T10:15" && Object.keys(JSON.parse(draft ?? "{}")).length === 2);
  check("nothing was booked", (await prisma.booking.count()) === 0);

  // ---- 2. log in, come back, the choices are still there
  await page.click('a[href="/auth?mode=login&next=/book"]');
  await page.waitForSelector("#email");
  await logIn("verified@example.com");
  await page.waitForURL((url: URL) => url.pathname === "/book");
  await page.waitForFunction(() => (document.querySelector("#datetime") as HTMLInputElement | null)?.value === "2026-12-05T10:15");
  check("after login the visitor is sent back to /book", new URL(page.url()).pathname === "/book");
  check("and the doctor they chose is still selected", (await page.inputValue("#doctorId")) === chosenDoctor);
  check("and the date and time they typed are still there", (await page.inputValue("#datetime")) === "2026-12-05T10:15");
  check("the form now says who is booking", /Booking as\s+verified/.test(await page.innerText("form")));

  // ---- 3. book, and the draft is cleared
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Your booking is saved");
  const row = await prisma.booking.findFirst({ include: { patient: true } });
  check("the booking is saved for the logged-in patient", row?.patient.userId === verified.id && row?.time === "10:15");
  check("the kept choices are cleared after a booking", (await page.evaluate(() => sessionStorage.getItem("carepoint_booking_draft"))) === null);

  // ---- 4. ?next= cannot send anyone to another site
  await context.clearCookies();
  await page.goto(`${BASE}/auth?mode=login&next=${encodeURIComponent("https://evil.example/steal")}`);
  await page.waitForSelector("#email");
  await logIn("verified@example.com");
  await page.waitForSelector("text=You are logged in");
  check("a ?next= pointing at another site is ignored: the visitor stays on this site", new URL(page.url()).origin === BASE);
  await context.clearCookies();
  await page.goto(`${BASE}/auth?mode=login&next=${encodeURIComponent("//evil.example")}`);
  await page.waitForSelector("#email");
  await logIn("verified@example.com");
  await page.waitForSelector("text=You are logged in");
  check("so is a protocol-relative one (//evil.example)", new URL(page.url()).origin === BASE);

  // ---- 5. an unverified patient is told, and can verify on the account page
  await context.clearCookies();
  await page.goto(`${BASE}/auth?mode=login&next=/book`);
  await page.waitForSelector("#email");
  await logIn("notyet@example.com");
  await page.waitForURL((url: URL) => url.pathname === "/book");
  await page.waitForFunction(() => !(document.querySelector('button[type="submit"]') as HTMLButtonElement).disabled);
  await page.selectOption("#doctorId", { index: 1 });
  await page.fill("#datetime", "2026-12-06T09:00");
  await page.click('button[type="submit"]');
  await page.waitForSelector('form [role="alert"]');
  const verifyAlert = await page.innerText('form [role="alert"]');
  console.log(`  unverified submit -> "${verifyAlert.replace(/\s+/g, " ")}"`);
  check("an unverified patient is told to verify their email", /Verify your email before booking/.test(verifyAlert));
  check("with a link to the account page", (await page.locator('form [role="alert"] a[href="/account"]').count()) === 1);
  check("and nothing was booked for them", (await prisma.booking.count({ where: { patient: { userId: unverified.id } } })) === 0);

  await page.goto(`${BASE}/account`);
  await page.waitForSelector("text=Not verified yet");
  check("the account page shows a verification panel with a code box", (await page.locator("#code").count()) === 1 && (await page.locator('h2:has-text("Verify your email")').count()) === 1);
  check("and the panel has no 'wrong email address' link (that email is the account's)", (await page.locator("text=Wrong email address").count()) === 0);
  let code = "";
  await sendVerificationEmail({ userId: unverified.id, kind: "verify" }, (async (m: { text: string }) => { code = m.text.match(/is (\d{6})\./)?.[1] ?? ""; }) as never);
  await page.fill("#code", code);
  await page.click('button:has-text("Verify email")');
  await page.waitForSelector("dd:has-text('Verified')");
  await page.waitForFunction(() => document.querySelectorAll("#code").length === 0);
  check("entering the code verifies the account, and the panel goes away", (await prisma.user.findUniqueOrThrow({ where: { id: unverified.id } })).emailVerifiedAt !== null);

  await page.goto(`${BASE}/book`);
  await page.waitForFunction(() => !(document.querySelector('button[type="submit"]') as HTMLButtonElement).disabled);
  await page.selectOption("#doctorId", { index: 1 });
  await page.fill("#datetime", "2026-12-06T09:00");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Your booking is saved");
  check("after verifying, the same patient can book", (await prisma.booking.count({ where: { patient: { userId: unverified.id } } })) === 1);

  await browser.close();
  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
