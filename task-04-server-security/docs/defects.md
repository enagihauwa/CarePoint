# Defects found in Task 4

Drafted by Claude at my request. Open item numbers are not renumbered when an item is fixed, so O1, O4 and O9 no longer appear. Line numbers were checked against the files on 3 November 2026. I need to check each line and reword it. Task 3 defects are in `task-03-client-validation/docs/defects.md`.

## Fixed during Task 4

| # | Defect | What fixed it | Evidence |
|---|---|---|---|
| F1 | **The server validated nothing** (Task 3 O1). A raw request saved `a`, `a@b`, an empty body and a 200,000-character name, and answered `201`. | Zod schemas share the form's rules, and a streamed 4 KB body limit. The same attacks now get `400` or `413`. | `evidence/12`, `12b`, `12c` |
| F2 | **The server believed the browser about the terms** (Task 3 O6). | It now refuses a registration unless `termsAccepted` is exactly `true`, and sets the time itself. This is only fixed in the sense that the request must say yes. The server cannot see a tick. | `docs/validation-placement.md` |
| F3 | **Nothing slowed down guessing.** | Rate limits per address and per email, with `429` and `Retry-After`. | `evidence/13`, `13b`, `13c` |
| F4 | **A breached password was accepted.** `password123` passed my rules. | The breach check refuses it. | `evidence/15`, `15a` |
| F5 | **Passwords were not stored or hashed** (Task 3 O7, this list's old O9). | Registration now hashes the password with Argon2id (`m=65536,t=3,p=4`) and stores a user and patient in one write. The test showed a 97-character hash and 0 rows holding the plaintext. | `evidence/06`, `docs/migrations.md` |
| F6 | **The server returned the patient `id`** (Task 3 O5, old O4). | Registration no longer returns an id. A duplicate email could not return a real one anyway. | `evidence/06` |
| F7 | **The same email could register twice** (Task 3 O2, old O1). | `User.email` is unique, and a second registration gets the same `201` answer as a new one, so it does not reveal who is registered. **Caveat:** the patient who owns that email is not told yet. That waits for the email in step 10. | `evidence/06`, `docs/migrations.md` |

## Open

| # | Defect | Where | Production cost |
|---|---|---|---|
| O2 | **`+0000000000` is accepted as a valid number** (Task 3 O3). | `src/lib/validation/auth.ts:49` | The front desk calls a number that cannot exist. Not fixed. |
| O3 | **Markup in a name is stored** (Task 3 O4). `<script>` is saved as text. | `src/lib/validation/schemas.ts:23` | A later page or email that prints names without escaping could run it. Not fixed. |
| O5 | **The client address can be faked.** The limiter reads `x-forwarded-for`, which a client can set. | `src/lib/rateLimit.ts:65` | An attacker rotates fake addresses and defeats the per-address limit. The per-email limit still holds (`evidence/14`). |
| O6 | **The rate-limit counters are in memory.** They reset on every restart and are not shared between servers. | `src/lib/rateLimit.ts:50` | A restart gives an attacker a fresh allowance, and two servers would count separately. Planned: PostgreSQL storage. |
| O7 | **The breach check fails open.** If the service is down, a breached password is accepted. | `src/lib/breachCheck.ts:42-51` | During an outage `password123` can register. **Decision: keep fail-open for now**, because the other password rules still apply (`docs/breach-check.md`). The condition was that failures are recorded and watched. Today a failure is only a line in the server console ("Breach check unavailable"), with no count and no alert, so the monitoring half is **not done**. |
| O8 | **The breach check runs at registration only.** | `src/app/api/register/route.ts` | A password reset must call it too, and reset is not built. |
| O10 | **Log in and reset return `501`.** | `src/app/api/login/route.ts`, `src/app/api/reset/route.ts` | Same as above. |
| O11 | **The register limit of 10 an hour is my number.** It is not from the clinic's real front-desk volume. | `src/lib/rateLimitConfig.ts` | A busy front desk registering walk-ins from one network could be blocked. **Provisional**: a development choice, to be reviewed against real usage and abuse before launch. |
| O12 | **The old unredacted Task 2 screenshot is still in git history** (`f8c0e57`). | git history | A real name and phone may be readable on GitHub. **Undecided.** The screenshot must be inspected first: if it shows a real person's details, rewrite history (a force-push over a merged branch); if it is dummy data, leave it. Nothing has been rewritten. |
| O13 | **Evidence scripts are not repeatable from the repo** (they need `playwright-core`). | `task-04-server-security/evidence/` | A reader cannot rerun them without installing a package. |
| O14 | **Online booking is paused.** `/api/bookings` answers `503`. A booking must now belong to a patient (`Booking.patientId` is required), and nobody can log in yet. | `src/app/api/bookings/route.ts` | The clinic cannot take online bookings until Task 5 adds login and sessions. I chose this over a nullable `patientId`, which would have broken my own schema. |
| O15 | **The sign-up form still says "Your details are saved"** after any `201`, including a duplicate email where nothing was saved. | `src/components/auth/SignupForm.tsx` | A patient who re-registers is told something untrue. Step 10 changes the message to "check your email". |
| O16 | **A placeholder patient holds the one old booking.** Its terms timestamp is not a real acceptance, and the booking's original name and phone are gone from the database (backup outside the repo only). | `prisma/migrations/20261103221500_add_accounts_and_payments/migration.sql` | A booking attributed to nobody, with a made-up consent record (`docs/migrations.md`). |
| O17 | **Email ownership is not verified.** A patient can register with someone else's email. | `src/app/api/register/route.ts` | Wrong people get a clinic account, and the real owner is never asked. Step 10. |

## Checked and not a defect

- The server refuses a body over 4 KB while reading it, not after (`evidence/12c`).
- The breach check sends only the first 5 characters of the hash (`evidence/15c`).
- Login and reset give generic messages, so they do not reveal whether an email exists (`docs/validation-placement.md`).
