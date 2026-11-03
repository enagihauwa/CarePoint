# Defects found in Task 4

Drafted by Claude at my request. Line numbers were checked against the files on 3 November 2026. I need to check each line and reword it. Task 3 defects are in `task-03-client-validation/docs/defects.md`.

## Fixed during Task 4

| # | Defect | What fixed it | Evidence |
|---|---|---|---|
| F1 | **The server validated nothing** (Task 3 O1). A raw request saved `a`, `a@b`, an empty body and a 200,000-character name, and answered `201`. | Zod schemas share the form's rules, and a streamed 4 KB body limit. The same attacks now get `400` or `413`. | `evidence/12`, `12b`, `12c` |
| F2 | **The server believed the browser about the terms** (Task 3 O6). | It now refuses a registration unless `termsAccepted` is exactly `true`, and sets the time itself. This is only fixed in the sense that the request must say yes. The server cannot see a tick. | `docs/validation-placement.md` |
| F3 | **Nothing slowed down guessing.** | Rate limits per address and per email, with `429` and `Retry-After`. | `evidence/13`, `13b`, `13c` |
| F4 | **A breached password was accepted.** `password123` passed my rules. | The breach check refuses it. | `evidence/15`, `15a` |

## Open

| # | Defect | Where | Production cost |
|---|---|---|---|
| O1 | **The same email can register twice** (Task 3 O2). Nothing is unique on `email`. | `prisma/schema.prisma:24` | Two accounts for one patient. Waits for the schema work. |
| O2 | **`+0000000000` is accepted as a valid number** (Task 3 O3). | `src/lib/validation/auth.ts:49` | The front desk calls a number that cannot exist. Not fixed. |
| O3 | **Markup in a name is stored** (Task 3 O4). `<script>` is saved as text. | `src/lib/validation/schemas.ts:23` | A later page or email that prints names without escaping could run it. Not fixed. |
| O4 | **The server returns the patient `id`** (Task 3 O5). | `src/app/api/register/route.ts:53` | Sequential ids reveal the clinic's size and are easy to guess. Not fixed. |
| O5 | **The client address can be faked.** The limiter reads `x-forwarded-for`, which a client can set. | `src/lib/rateLimit.ts:65` | An attacker rotates fake addresses and defeats the per-address limit. The per-email limit still holds (`evidence/14`). |
| O6 | **The rate-limit counters are in memory.** They reset on every restart and are not shared between servers. | `src/lib/rateLimit.ts:50` | A restart gives an attacker a fresh allowance, and two servers would count separately. Planned: PostgreSQL storage. |
| O7 | **The breach check fails open.** If the service is down, a breached password is accepted. | `src/lib/breachCheck.ts:42-51` | During an outage `password123` can register. **Decision: keep fail-open for now**, because the other password rules still apply (`docs/breach-check.md`). The condition was that failures are recorded and watched. Today a failure is only a line in the server console ("Breach check unavailable"), with no count and no alert, so the monitoring half is **not done**. |
| O8 | **The breach check runs at registration only.** | `src/app/api/register/route.ts` | A password reset must call it too, and reset is not built. |
| O9 | **No password is stored or hashed yet.** Hashing is measured (`docs/hashing.md`) but there is no users table. | `prisma/schema.prisma` | A patient can register but not log in. Waits for the schema. |
| O10 | **Log in and reset return `501`.** | `src/app/api/login/route.ts`, `src/app/api/reset/route.ts` | Same as above. |
| O11 | **The register limit of 10 an hour is my number.** It is not from the clinic's real front-desk volume. | `src/lib/rateLimitConfig.ts` | A busy front desk registering walk-ins from one network could be blocked. **Provisional**: a development choice, to be reviewed against real usage and abuse before launch. |
| O12 | **The old unredacted Task 2 screenshot is still in git history** (`f8c0e57`). | git history | A real name and phone may be readable on GitHub. **Undecided.** The screenshot must be inspected first: if it shows a real person's details, rewrite history (a force-push over a merged branch); if it is dummy data, leave it. Nothing has been rewritten. |
| O13 | **Evidence scripts are not repeatable from the repo** (they need `playwright-core`). | `task-04-server-source-of-truth/evidence/` | A reader cannot rerun them without installing a package. |

## Checked and not a defect

- The server refuses a body over 4 KB while reading it, not after (`evidence/12c`).
- The breach check sends only the first 5 characters of the hash (`evidence/15c`).
- Login and reset give generic messages, so they do not reveal whether an email exists (`docs/validation-placement.md`).
