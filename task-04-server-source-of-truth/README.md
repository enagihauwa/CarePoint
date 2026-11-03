# Task 4: the server is the source of truth

Task 3 showed that the browser's rules are not a security boundary. Task 4 moves the rules to the server, slows down guessing, checks new passwords against known breaches, and designs the real database. Some parts are **not finished**, and the Status section says which.

Drafted by Claude at my request from the files in this folder, so the wording is not all mine.

## Where the code is

This folder holds the notes and the evidence. **The code is in the app itself**:

| What | Where |
|---|---|
| Server rules (Zod schemas), shared with the form | `src/lib/validation/schemas.ts`, `src/lib/validation/auth.ts` |
| Streamed 4 KB body limit | `src/lib/http.ts` |
| Rate limiting | `src/lib/rateLimit.ts`, `src/lib/rateLimitConfig.ts` |
| Breach check (Have I Been Pwned, k-anonymity) | `src/lib/breachCheck.ts` |
| Registration, login and reset routes | `src/app/api/register/route.ts`, `login/route.ts`, `reset/route.ts` |
| Verification email, styled with the Task 1 tokens | `src/lib/email/verificationEmail.ts`, `scripts/email-tokens.js` |
| Hash timing script | `scripts/hash-timing.js` |

## Documents (`docs/`)

| File | What it covers |
|---|---|
| `schema.md` | The nine-table design, every column, indexes and their cost (design only, not built) |
| `hashing.md` | Argon2id measured against a fast hash |
| `validation-placement.md` | What is checked where, and what the server must never trust |
| `rate-limiting.md` | The limits, why two keys, what an in-memory store cannot do |
| `breach-check.md` | How the check works, and why it fails open |
| `email-copy.md` | The email's styling, the wrong first render, and the copy changes |
| `not-implemented.md` | Security controls I chose not to build |
| `defects.md` | What is fixed and what is still open |

## Evidence (`evidence/`)

Files marked "claude-capture" were produced by Claude Code at my request. The others are from my own machine.

| Files | Shows |
|---|---|
| `01`, `01a` | My paper schema drawing (a retake is pending) |
| `07`, `08` | Hashing: two hashes of one password differ, and the timing |
| `11`, `12`, `12b`, `12c` | Server validation timing, the raw-request attacks before and after, regression |
| `13`, `13b`, `13c`, `14` | Rate limit triggered, UI check, logic checks, and the address limit defeated |
| `15`, `15a`, `15b`, `15c` | The breach check: results, my screenshot, regression, logic checks |
| `23`, `23a` | The verification email in Chrome, and the wrong first render |

## How to run it

See the root `README.md` for set-up. For the evidence scripts, the `.sh` files need the app running on a production build (`npm run build`, then `npm start`) on a throwaway database. Some scripts need `playwright-core`, which is not in `package.json`.

## Status

| Done | Not done |
|---|---|
| Server validation, body limit, rate limiting, breach check | The database tables (the schema is on paper only) |
| Hashing measured | Hashing applied to stored passwords (no users table yet) |
| Verification email template and render | Email verification, SMTP, background job, evidence `16` to `22` |
| `not-implemented.md`, `defects.md` | Migrations by hand and `docs/migrations.md`, evidence `02` to `06`, `09`, `10` |
| | My 19 interview answers, and the optional walkthrough |

Login and reset still return `501`. Nothing here claims a patient can log in.
