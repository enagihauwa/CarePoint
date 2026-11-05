// Task 5, piece 5: the front-desk page in a real headless Chrome against a PRODUCTION BUILD on a THROWAWAY database.
// Run by Claude Code. NOT my own evidence (16 is mine). Needs playwright-core, which is not a project dependency.
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
  const PW = "Zq9-front-desk-kite-7-vault";
  const hash = await argon2.hash(PW, { type: argon2.argon2id });
  const admin = await prisma.user.create({ data: { email: "uidesk@example.com", passwordHash: hash, name: "UI Desk", role: "admin", emailVerifiedAt: new Date() } });
  const pat = await prisma.user.create({ data: { email: "uipat@example.com", passwordHash: hash, name: "UI Patient", emailVerifiedAt: new Date(), patient: { create: { phone: "08055556666", termsAcceptedAt: new Date() } } }, include: { patient: true } });
  const doctor = await prisma.doctor.create({ data: { name: "Dr UI", specialty: "GP" } });
  const booking = await prisma.booking.create({ data: { patientId: pat.patient!.id, doctorId: doctor.id, date: new Date("2026-12-09"), time: "15:00" } });

  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const page = await (await browser.newContext()).newPage();

  // a patient is turned away with a real 403 page
  await page.goto(`${BASE}/auth?mode=login`); await page.fill("#email", "uipat@example.com"); await page.fill("#password", PW); await page.click('button[type="submit"]');
  await page.waitForSelector("text=You are logged in");
  const resp = await page.goto(`${BASE}/admin`);
  check("a patient in a real browser gets HTTP 403 and the 'no access' page", resp.status() === 403 && (await page.locator("text=You do not have access to this page").count()) === 1);
  check("and the page shows no patient or booking data", (await page.content()).includes("UI Patient") === false);
  await page.context().clearCookies();

  // the admin logs in (asked to come back to /admin), sees the booking and records the payment
  await page.goto(`${BASE}/admin`);
  check("a visitor with no login who opens /admin lands on the login page", /\/auth\?mode=login&next=\/admin/.test(page.url()));
  await page.waitForSelector("#email"); await page.fill("#email", "uidesk@example.com"); await page.fill("#password", PW); await page.click('button[type="submit"]');
  await page.waitForURL((url: URL) => url.pathname === "/admin");
  await page.waitForSelector(`text=Booking ${booking.id}`);
  check("after logging in the admin is sent on to /admin and sees the booking", (await page.locator("text=UI Patient").count()) >= 1 && (await page.locator("text=Not paid yet").count()) === 1);

  await page.click('button:has-text("Record as paid")');
  await page.waitForSelector('[role="alert"]:has-text("amount")');
  check("submitting an empty form shows a message and saves nothing", (await prisma.payment.count()) === 0);
  await page.fill(`#booking-${booking.id}-amount`, "12500.50");
  await page.selectOption(`#booking-${booking.id}-method`, "transfer");
  await page.click('button:has-text("Record as paid")');
  await page.waitForSelector("text=Paid");
  await page.waitForFunction(() => document.querySelectorAll("form.admin-pay").length === 0);
  const text = await page.innerText("main");
  console.log(`  after recording: ${text.replace(/\s+/g, " ").slice(0, 260)}`);
  const pay = await prisma.payment.findFirstOrThrow({ where: { bookingId: booking.id } });
  check("the page shows the payment as paid, by bank transfer, recorded by the admin", /12,500\.50/.test(text) && /bank transfer/.test(text) && /recorded by UI Desk/.test(text));
  check("the form is gone for that booking, and the database agrees (paid, 1250050 kobo, by the admin)", pay.status === "paid" && pay.amountKobo === 1250050 && pay.recordedById === admin.id);

  await browser.close();
  console.log(`\nresult: ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
