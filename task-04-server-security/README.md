# Task 4: server security

Task 4 is the server security task. Task 3 showed that the browser's rules are not a security boundary. Task 4 moves the rules to the server, slows down guessing, checks new passwords against known breaches, and designs the real database. Some parts are **not finished**, and the Status section says which.

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
| `schema.md` | The nine-table design, every column, indexes and their cost |
| `migrations.md` | The required-column failure, the three-step fix, and a mistake of mine |
| `hashing.md` | Argon2id measured against a fast hash |
| `validation-placement.md` | What is checked where, and what the server must never trust |
| `rate-limiting.md` | The limits, why two keys, what an in-memory store cannot do |
| `breach-check.md` | How the check works, and why it fails open |
| `email-copy.md` | The email's styling, the wrong first render, and the copy changes |
| `not-implemented.md` | Security controls I chose not to build |
| `verification-design.md` | Email verification: the design, what was built, and what went wrong |
| `defects.md` | What is fixed and what is still open |

## Evidence (`evidence/`)

Files marked "claude-capture" were produced by Claude Code at my request. The others are from my own machine.

| Files | Shows |
|---|---|
| `01`, `01a`, `01b` | My paper schema drawing, and two earlier versions |
| `02` to `06`, `05b` | Database before and after the migration, the failure and the fix, and registration storing a hash (Claude captures) |
| `07`, `08` | Hashing: two hashes of one password differ, and the timing |
| `11`, `12`, `12b`, `12c` | Server validation timing, the raw-request attacks before and after, regression |
| `13`, `13b`, `13c`, `14` | Rate limit triggered, UI check, logic checks, and the address limit defeated |
| `15`, `15a`, `15b`, `15c` | The breach check: results, my screenshot, regression, logic checks |
| `09`, `10`, `10a` | My sign-up input (capitals in the email) and the stored, normalised row, and Claude's check of it |
| `16`, `16a`, `17`, `17a`, `17b` | Gmail refusing my normal password, a network timeout, the app password working, and two test sends |
| `18`, `18a` | Registration time with the email queued, against sending it in the request, and the queue checks |
| `19` to `22b`, `19a`, `19b` | Code logic, the routes over HTTP (stored hash, expired, wrong, reused), and the page in a browser |
| `19c`, `19d`, `19e` | The real end-to-end run: database state, the verified page and the duplicate notice (names hidden) |
| `24` | A fresh clone following the root README: what worked and the gap it found |
| `23`, `23a`, `23b` | The verification email in Chrome, the wrong first render, and in a real Gmail inbox |

## How to run it

See the root `README.md` for set-up. For the evidence scripts, the `.sh` files need the app running on a production build (`npm run build`, then `npm start`) on a throwaway database. Some scripts need `playwright-core`, which is not in `package.json`.

## Status

| Done | Not done |
|---|---|
| Server validation, body limit, rate limiting, breach check | Online booking (paused until Task 5) |
| Hashing measured and applied to stored passwords | Login and sessions (Task 5) |
| Nine tables, migrated by hand (`docs/migrations.md`), and registration creates a hashed user | A person (not Claude) following the README from a fresh clone |
| Email verification end to end: codes, queue, worker, Gmail, the page, and a real run | A sending domain so mail stops landing in Spam |
| `not-implemented.md`, `defects.md`, `verification-design.md` | My own screenshot `02` |
| | My 19 interview answers, and the optional walkthrough |

Login and reset still return `501`, and online booking is paused (`503`). The verification worker is started by hand with `npm run worker`. Nothing here claims a patient can log in.
