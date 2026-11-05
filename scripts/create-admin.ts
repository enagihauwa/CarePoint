// Creates the front-desk (admin) account. Run by hand, once: npm run create-admin
// There is deliberately NO way to become an admin through the website: the register route only ever makes
// patients, and ignores a "role" sent in the request. This script is the only door.
//
// It reads the details from .env, so no password is typed on a command line (shell history keeps those) and none is
// in the repo:  ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME (optional).
// REMOVE ADMIN_PASSWORD from .env once the account exists.
import "./loadEnv"; // must stay the first import (see loadEnv.ts)
import argon2 from "argon2";
import { prisma } from "../src/lib/db";
import { validateEmail, validatePassword } from "../src/lib/validation/auth";

async function main() {
  const rawEmail = process.env.ADMIN_EMAIL ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = (process.env.ADMIN_NAME ?? "Front desk").trim() || "Front desk";

  // The same rules as for a patient's password and email.
  const emailProblem = validateEmail(rawEmail);
  const passwordProblem = validatePassword(password);
  if (emailProblem || passwordProblem) {
    console.error(`Not created. ${emailProblem ?? ""} ${passwordProblem ?? ""}`.trim());
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env (names only are in .env.example).");
    process.exit(1);
  }
  const email = rawEmail.trim().toLowerCase();

  // Never change an existing account's role from here: someone's patient account must not become staff by accident.
  if (await prisma.user.findUnique({ where: { email } })) {
    console.error("Not created: an account with that email already exists.");
    process.exit(1);
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  // Staff have no patient profile. The address is treated as verified: the person who runs this script owns it.
  const user = await prisma.user.create({ data: { email, passwordHash, name, role: "admin", emailVerifiedAt: new Date() } });
  // Id only: no email, no password.
  console.log(`Admin account created (user id ${user.id}). Now remove ADMIN_PASSWORD from .env.`);
}

main()
  .catch((error) => { console.error("Failed:", error instanceof Error ? error.message : error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
