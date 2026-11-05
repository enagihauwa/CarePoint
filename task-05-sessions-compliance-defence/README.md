# Task 5: sessions, compliance and defence

Task 5 makes the accounts real: a patient can log in, stay logged in, log out, reset a password and book, and the server decides who is allowed to do what. It also covers what the clinic must do with patients' data (deletion, retention, privacy) and defending my choices. **Task 5 is not finished**, and the Status section says exactly what is.

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
| Migrations | `prisma/migrations/20261104130000_add_session_last_seen`, `20261105120000_add_code_purpose` |

## Documents (`docs/`)

| File | What it covers |
|---|---|
| `decisions.md` | Eight decisions with the reason from my business: cookie `SameSite`, session lengths, gating, login before verification, the deletion grace period, the admin action, who checks the session, and how soft gating works |
| `plan.md` | The seven pieces, in order, and the risks I saw before building |
| `password-reset.md` | How a reset works, the numbers, and what it deliberately leaves out |
| `not-implemented.md` | What I chose not to build, and why |
| `mistakes-log.md` | Sixteen entries, with who made each mistake and the proof. **Drafted by Claude: I must read it and add mine** |
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

My own captures for booking (**`03`**, soft gating in my browser) and for hard gating (**`04`**) are **not taken yet**.

## How to run it

See the root `README.md` for set-up. The worker (`npm run worker`) must be running for the reset and verification emails, and **it must be restarted after code changes**: a worker started before the reset was added ignores reset jobs. The evidence scripts need a production build (`npm run build`, then `npm start`) on a throwaway database. `03b` needs `playwright-core`, which is not in `package.json`. To see hard gating: `git checkout hard-gating`, run the app, then `git checkout main`.

## Status

| Done | Not done |
|---|---|
| Sessions: a random token, only its hash stored, cookie flags, 7 days for patients and 8 hours for staff | **Admin page and "record a payment as paid"** (piece 5). There is no admin account yet |
| Login with one message for every failure, and matching time | **Account deletion and the scheduled purge** (piece 6), with its migration |
| The proxy and the database check, and logout that deletes the row | **State management** (piece 7) |
| Password reset that ends every session | My own captures `03` and `04` |
| Booking for a verified patient, soft gating shipped, hard gating on a branch | The real owner interview, `retention-matrix.md`, `privacy.md`, `sessions.md`, `gating.md`, `state-management.md`, the handbook, the article, `what-i-do-not-know.md`, `defects.md`, and the 22 interview answers |
| Verifying an email from the account page | A person (not Claude) following the README from a fresh clone |

**What is proven, and by whom.** Sessions, logout and the reset were each seen working in my own browser (`01` to `11`). Booking and the gating were tested by Claude Code over HTTP and in a headless Chrome. **I have not yet booked an appointment myself in my own browser.** **A known weakness:** if I add a new page and forget to call `getCurrentUser()` in it, that page is unprotected, because the proxy only checks that a cookie exists (`docs/decisions.md`, decision 7). **Nothing yet deletes a patient's data**: account deletion is piece 6 (`docs/not-implemented.md` lists what else is missing).
