# Task 5 plan (before any code)

Written 4 November 2026. **Drafted by Claude for my approval. Nothing here is built.** It follows `AGENT-RULES.md`: summarise and wait, smallest thing per step, no migrations run by the agent, and I write my own defects, reflections and answers.

## What I read

`AGENT-RULES.md`, the Task 5 checklist, `prisma/schema.prisma`, the Task 4 documents (`schema.md`, `verification-design.md`, `defects.md`, `rate-limiting.md`, `validation-placement.md`), and the current code: `src/lib/rateLimit.ts`, `queue.ts`, `verification.ts`, the register, verify, login and reset routes.

## Where I start from (checked in the repo, not assumed)

- A `Session` table exists (`tokenHash` unique, `expiresAt`, `revokedAt`) but **no code uses it**. There is no `lastSeenAt`.
- **Login and reset answer `501`.** Nobody can log in.
- **Online booking answers `503`.** It needs a logged-in, verified patient.
- `User.role` exists (`patient` or `admin`), `emailVerifiedAt` is set by the verification code, and **nothing checks it yet**.
- `Payment` and `PaymentEvent` exist but nothing writes to them. There is no admin account and no admin page.
- The worker (pg-boss) runs by hand with `npm run worker`.
- `AGENTS.md` warns that this Next.js version has breaking changes. **I will read the guides in `node_modules/next/dist/docs/` before writing the cookie and middleware code.** I expect that "middleware" may have a different name or shape in this version, and I will not assume.

## Build order, one piece at a time, stopping after each

| Piece | What | Checklist items | Evidence |
|---|---|---|---|
| 1 | **Sessions and login.** Token from `crypto.randomBytes(32)`, only its SHA-256 stored, cookie flags from decisions 1 and 2, a fresh token on every login, a generic "Incorrect email or password" with a dummy hash for unknown emails so timing matches, the rate limit, the verified-email rule from decision 4. | 1, 3 | `01`, `02`, `05` |
| 2 | **Middleware and logout.** Read the cookie, find the hashed token, reject expired sessions, check the account is active, attach the user, redirect or 401. Logout deletes the row, and the UI shows "logged out" only after the server confirms. Break it on purpose with the network blocked, then fix it. | 4 | `06` to `10` |
| 3 | **Password reset that kills all sessions.** Reset is `501` today, so this builds it first: an emailed code through the existing queue, then every session for that user deleted. | 5 | `11` |
| 4 | **Gating and booking back.** Soft gating shipped, hard gating on a branch, booking tied to the logged-in, verified patient. | 2 | `03`, `04` |
| 5 | **Admin route and "record a payment as paid".** An admin from a seed script, a role check on the server for both the page and the API, a `PaymentEvent` for each change. | 10 | `16` |
| 6 | **Account deletion and the scheduled purge.** Pending state, anonymise identity, revoke sessions, a daily job that purges in one transaction and logs `JOB START` and `JOB END` with counts, run twice. | 6 | `12` to `14` |
| 7 | **State management.** I ask the agent the question first, then implement one real use: the forgot-password form carries the email from a failed login with no server call. | 9 | `15` |

## Migrations (I run them by hand, or waive the rule each time)

Pieces 1, 3 and 6 need schema changes. I will give the command and the reason, then stop.
- `Session.lastSeenAt` (piece 1).
- `User.status` (active, pending deletion) and `User.deletionRequestedAt` (piece 6).
- A way for a reset code to differ from a verification code: either a `purpose` column on `EmailVerification` or a new table (piece 3). I will ask which before building.

## Writing, which I do (Claude only asks questions and tightens wording)

- **`interview-with-owner.md`.** Twenty minutes with a real business owner. This has to be booked and cannot be faked.
- **`retention-matrix.md`, `privacy.md`, and `privacy-draft-with-broken-promise.md`.** Every table and significant column, purged or retained, the reason, the basis and the duration, plus the conflict between erasure and payment records.
- **`sessions.md`, `gating.md`, `state-management.md`.**
- **`handbook.md`** (seven sections) from `mistakes-log.md`, **the published article** (about 1,500 words, with a screenshot and the URL in the README), **`what-i-do-not-know.md`** (at least eight items), **`defects.md`** with real file and line numbers, and **22 interview answers**, where Q20 cites three numbers from `numbers-cheatsheet.md`.

## Risks I can already see

- **Evidence that needs two browsers or DevTools** (cookie flags, the blocked logout request, two users in one browser, the reset killing the other browser's session) can only come from my machine, with my actions.
- **The worker must be running** for reset emails and for the daily purge.
- **`Secure` cookies and localhost.** The cookie is `Secure` except on `localhost`, as the brief says.
- **The rate limiter's weak address check** (defect O5) still applies to login. The per-email limit is what holds.
