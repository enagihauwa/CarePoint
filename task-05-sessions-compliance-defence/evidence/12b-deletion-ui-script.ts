// Task 5, piece 6: asking to delete an account, in a real headless Chrome against a PRODUCTION BUILD on a THROWAWAY
// database. Run by Claude Code. NOT my own evidence (12, 13 and 14 are mine). Needs playwright-core, which is not a
// project dependency.
// Run: DATABASE_URL=<throwaway> PLAYWRIGHT_CORE=<path to playwright-core> npx tsx <this file>
import "../../scripts/loadEnv";
import argon2 from "argon2";
import { createRequire } from "node:module";
import { prisma } from "../../src/lib/db";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE as string);
const BASE = "http://localhost:3077";
let pass = 0, fail = 0;
const check = (label: string, ok: boolean, detail = "") => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  [" + detail + "]" : ""}`); };

(async () => {
  const PW = "Zq9-delete-ui-kite-7-vault";
  const hash = await argon2.hash(PW, { type: argon2.argon2id });
  const user = await prisma.user.create({ data: { email: "uidel@example.com", passwordHash: hash, name: "UI Deleter", emailVerifiedAt: new Date(), patient: { create: { phone: "08077778888", termsAcceptedAt: new Date() } } } });
  await prisma.doctor.create({ data: { name: "Dr UI", specialty: "GP" } });

  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await (await browser.newContext()).newPage();
  const logIn = async () => {
    await page.goto(`${BASE}/auth?mode=login`);
    await page.waitForSelector("#email");
    await page.fill("#email", "uidel@example.com"); await page.fill("#password", PW); await page.click('button[type="submit"]');
    await page.waitForSelector("text=You are logged in");
  };

  await logIn();
  await page.goto(`${BASE}/account`);
  check("an active patient sees 'Delete my account' with what will happen", (await page.locator("text=Your name, email address and phone number are removed after 14 days").count()) === 1);
  check("the password box is NOT shown until they choose to continue", (await page.locator("#delete-password").count()) === 0);
  await page.click('button:has-text("I want to delete my account")');
  await page.waitForSelector("#delete-password");

  await page.click('form button[type="submit"]:has-text("Delete my account")');
  await page.waitForSelector('[role="alert"]:has-text("Enter your password")');
  check("submitting with no password shows a message and changes nothing", (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).status === "active");
  await page.fill("#delete-password", "not my password");
  await page.click('form button[type="submit"]:has-text("Delete my account")');
  await page.waitForSelector('[role="alert"]:has-text("not right")');
  check("a wrong password shows 'That password is not right' and changes nothing", (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).status === "active");

  await page.fill("#delete-password", PW);
  await page.click('form button[type="submit"]:has-text("Delete my account")');
  await page.waitForURL((url: URL) => url.pathname === "/auth" && url.searchParams.get("notice") === "deletion");
  await page.waitForSelector("text=scheduled for deletion and you have been logged out");
  check("the right password: the patient is sent to the login page with a notice that says they were logged out", true);
  check("the database agrees: pending_deletion, and every session is gone", (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).status === "pending_deletion" && (await prisma.session.count({ where: { userId: user.id } })) === 0);
  const back = await page.goto(`${BASE}/account`);
  check("the account page now sends the logged-out browser to login", /\/auth\?mode=login/.test(page.url()) && back !== null);

  await logIn();
  await page.goto(`${BASE}/account`);
  await page.waitForSelector("text=Your account is scheduled for deletion");
  const pendingText = await page.innerText("main");
  console.log(`  pending account page: ${pendingText.replace(/\s+/g, " ").slice(0, 330)}`);
  check("a pending patient can log in and sees the date and a 'Cancel the deletion' button", /On or after .*20\d\d/.test(pendingText) && (await page.locator('button:has-text("Cancel the deletion")').count()) === 1);
  check("and the 'Delete my account' form is not offered again", (await page.locator("#delete-password").count()) === 0);

  await page.goto(`${BASE}/book`);
  await page.waitForFunction(() => !(document.querySelector('button[type="submit"]') as HTMLButtonElement).disabled);
  await page.selectOption("#doctorId", { index: 1 });
  await page.fill("#datetime", "2026-12-09T09:00");
  await page.click('button[type="submit"]');
  await page.waitForSelector('form [role="alert"]');
  check("trying to book while the deletion is scheduled is refused with a clear message", /scheduled for deletion/.test(await page.innerText('form [role="alert"]')) && (await prisma.booking.count()) === 0);

  await page.goto(`${BASE}/account`);
  await page.click('button:has-text("Cancel the deletion")');
  await page.waitForSelector("text=I want to delete my account");
  const active = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  check("cancelling: the page goes back to 'Delete my account' and the database agrees (active, no request time)", active.status === "active" && active.deletionRequestedAt === null);

  await browser.close();
  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
