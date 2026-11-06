# Task 5: sessions, compliance and defence

Task 5 makes the accounts real: a patient can log in, stay logged in, log out, reset a password, book and delete their account, front-desk staff can record payments, and the server decides who is allowed to do what. It also covers what the clinic must do with patients' data (deletion, retention, privacy) and defending my choices. **Task 5 is not finished**, and the Status section says exactly what is.

Drafted by Claude at my request from the files in this folder and the code, so the wording is not all mine. **The documents about my own reasoning, my reflections and my interview answers are mine to write, and they are not written yet.**

## Where the code is

This folder holds the notes and the evidence. **The code is in the app itself**:

| What | Where |
|---|---|
| Session token, hash, cookie flags, expiry | `src/lib/session.ts`, `src/lib/sessionConfig.ts` |
| Log in | `src/app/api/login/route.ts`, `src/components/auth/LoginForm.tsx` |
| The quick cookie check, before a page is built | `src/proxy.ts` |
| The real check, against the database | `src/lib/currentUser.ts` (`getCurrentUser`, `userForToken`) |
| Log out and the account page | `src/app/api/logout/route.ts`, `src/app/account/` |
| Password reset | `src/app/api/reset/route.ts`, `src/app/api/reset/confirm/route.ts`, `src/components/auth/ResetForm.tsx`, `src/jobs/sendVerificationEmail.ts`, `src/lib/email/verificationEmail.ts` |
| Booking for a logged-in, verified patient | `src/app/api/bookings/route.ts`, `src/app/book/` |
| Hard gating (not merged) | the git branch `hard-gating`, one commit on top of `main` |
| The admin account (the only door to one) | `scripts/create-admin.ts`, run as `npm run create-admin` |
| The front-desk page, the 403 page, recording a payment | `src/app/admin/`, `src/app/forbidden.tsx`, `src/app/api/admin/payments/route.ts`, `src/lib/money.ts` |
| Asking to delete an account, and cancelling | `src/app/api/account/delete/route.ts`, `src/app/api/account/delete/cancel/route.ts`, `src/app/account/AccountDeletion.tsx` |
| The nightly purge, and its schedule | `src/jobs/purgeDeletedAccounts.ts`, `scripts/worker.ts`, `src/lib/deletionConfig.ts`; run by hand with `npm run purge-now` (`scripts/purge-now.ts`) |
| Migrations | `prisma/migrations/20261104130000_add_session_last_seen`, `20261105120000_add_code_purpose`, `20261105180000_add_account_status` |

## Documents (`docs/`)

| File | What it covers |
|---|---|
| `decisions.md` | Ten decisions with the reason from my business: cookie `SameSite`, session lengths, gating, login before verification, the deletion grace period, the admin action, who checks the session, how soft gating works, the admin account and payments, and how deletion works |
| `plan.md` | The seven pieces, in order, and the risks I saw before building |
| `password-reset.md` | How a reset works, the numbers, and what it deliberately leaves out |
| `not-implemented.md` | What I chose not to build, and why |
| `mistakes-log.md` | Eighteen entries, with who made each mistake and the proof. **Drafted by Claude: I must read it and add mine** |
| `numbers-cheatsheet.md` | Every number, where it lives and why, for the viva |

## Evidence (`evidence/`)

Files marked "Claude" were produced by Claude Code at my request, on a **throwaway database**, and are labelled so in their headers. The others are from my own machine and my own actions. Screenshots are redacted: names, emails and the session token are covered.

| Files | Shows | Who |
|---|---|---|
| `01-two-session-ids.txt` | Two logins make two different session ids | me |
| `01a-login-session-checks.txt`, `-script.ts` | 30 checks of the login route over HTTP | Claude |
| `02-cookie-flags.png` | `HttpOnly`, `SameSite=Lax`, `Path=/` in the browser | me |
| `05a`, `05b` | A wrong password and an unknown email give the same message | me |
| `06a-proxy-logout-checks.txt`, `-script.ts` | 25 checks: the proxy, the database check, logout. Its header records a flaw in my first test | Claude |
| `07` | The account page for a logged-in patient | me |
| `08`, `09` | The first logout said "logged out" with the network blocked, and the session was still in the database | me |
| `10`, `10a` | The fixed button shows an error and keeps the session. A real logout removes the row | me |
| `11`, `11b`, `11c` | A password reset in one browser ends the session in the other | me |
| `11a-password-reset-checks.txt`, `-script.ts` | 45 checks of the reset, after deliberately breaking it twice to prove the tests notice | Claude |
| `03a-booking-gating-checks.txt`, `-script.ts` | 29 checks of the booking rules over HTTP, after breaking three on purpose | Claude |
| `03b-booking-ui-checks.txt`, `-script.ts` | 19 checks in a real headless Chrome: the kept choices, `?next=`, verifying on the account page | Claude |
| `04a-hard-gating-branch-checks.txt` | The `hard-gating` branch redirects a visitor with no login or a made-up cookie | Claude |
| `16a-admin-payments-checks.txt`, `-script.ts` | 52 checks of the admin account, the real 403, and payments. Its header records that my first test for two clicks at once proved nothing | Claude |
| `16b-admin-ui-checks.txt`, `-script.ts` | 7 checks of the front-desk page in a real headless Chrome | Claude |
| `12a-account-deletion-checks.txt`, `-script.ts` | 64 checks: asking, cancelling, the purge with controlled dates (including "all or nothing"), the real `purge-now` script and the real worker, after breaking seven things on purpose | Claude |
| `12b-deletion-ui-checks.txt`, `-script.ts` | 11 checks of the deletion flow in a real headless Chrome | Claude |

My own captures are **not taken yet** for: booking (**`03`**), hard gating (**`04`**), the front desk and the 403 (**`16`**), and deletion and the purge (**`12`, `13`, `14`**).

## How to run it

See the root `README.md` for set-up. **Apply the migrations before running the new code** (`npx prisma migrate deploy`, then `npx prisma generate`): `getCurrentUser()` reads the whole user row, so a database without the newest column fails every logged-in request. The worker (`npm run worker`) must be running for the emails and for the nightly purge, and **it must be restarted after code changes**: a worker started before a change runs the old code. To make the front-desk account, put `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, run `npm run create-admin`, then remove the password from `.env`. To run the purge now instead of waiting for 02:00: `npm run purge-now` (it only touches accounts whose 14 days have ended). The evidence scripts need a production build (`npm run build`, then `npm start`) on a throwaway database. `03b`, `16b` and `12b` need `playwright-core`, which is not in `package.json`. To see hard gating: `git checkout hard-gating`, run the app, then `git checkout main`.

## Status

| Done | Not done |
|---|---|
| Sessions: a random token, only its hash stored, cookie flags, 7 days for patients and 8 hours for staff | **State management** (piece 7) |
| Login with one message for every failure, and matching time | My own captures `03`, `04`, `16`, `12`, `13`, `14` |
| The proxy and the database check, and logout that deletes the row | The real owner interview, `retention-matrix.md`, `privacy.md`, `sessions.md`, `gating.md`, `state-management.md`, the handbook, the article, `what-i-do-not-know.md`, `defects.md`, and the 22 interview answers |
| Password reset that ends every session | A person (not Claude) following the README from a fresh clone |
| Booking for a verified patient, soft gating shipped, hard gating on a branch | |
| An admin account that only a script can make, a real 403 for patients, and "record a payment as paid" under a row lock | |
| Account deletion with a 14-day grace period, and a nightly purge that anonymises in one transaction | |

**What is proven, and by whom.** Sessions, logout and the reset were each seen working in my own browser (`01` to `11`). **Booking, the admin page and deletion were tested by Claude Code, over HTTP and in a headless Chrome, and I have not yet done any of them myself.** The migration for deletion (`add_account_status`) is **prepared but not applied to my database**: I run it by hand. Two limits I know of: if I add a new page and forget to call `getCurrentUser()` in it, that page is unprotected, because the proxy only checks that a cookie exists (`docs/decisions.md`, decision 7); and booking and payment records are kept after an account is purged, because I have not decided the retention period and the legal one must be checked by me (`docs/not-implemented.md`).
