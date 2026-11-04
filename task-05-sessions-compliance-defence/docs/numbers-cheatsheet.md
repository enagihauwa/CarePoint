# Numbers cheatsheet

Started 4 November 2026. **Drafted by Claude from the repo's files, so the wording is not all mine.** Every number has the file it comes from, so I can re-check it in a viva. I must be able to say why each one is the value it is. **Question 20 of the Task 5 interview answers must cite three numbers that match my earlier tasks.** The three marked ★ are my suggested set: one from Task 1, one from Task 4 hashing and one from Task 4 rate limiting.

## Task 1: design system

| Number | Value | Where | Why |
|---|---|---|---|
| ★ Line height rule | font size x 1.5 for every style | `task-01-design-system/docs/type-scale.md` | Breathing room on small phones. |
| Headline Large | 32 px size, 48 px line height | `src/styles/tokens.css` (`--type-headline-large-*`) | A line height of 1.5. |
| Smallest text | 12 px | `task-01-design-system/docs/type-scale.md`, section "Minimum size" | Raised from 11 and 12 px, because small text on low-cost Android phones in daylight needs a floor. |

## Task 4: passwords and hashing

| Number | Value | Where | Why |
|---|---|---|---|
| ★ One Argon2id hash | 77.29 ms | `task-04-server-security/evidence/08-timing-argon-vs-sha.txt`, `docs/hashing.md` | The cost the attacker pays per guess. |
| Argon2id guesses per second | 12.9 | same | 1000 / 77.29. |
| One SHA-256 hash | 0.00346 ms (average of 1,000) | same | The comparison. About 288,775 guesses per second. |
| Argon2id settings | `m=65536` (64 MiB), `t=3`, `p=4` | `evidence/07-hash-twice-different.txt` | The library's defaults. |
| Password length | 8 to 64 characters | `src/lib/validation/auth.ts` | Task 3 rules. |
| Request body limit | 4,096 bytes | `src/lib/validation/schemas.ts`, `docs/validation-placement.md` | Worked out from the field maximums plus JSON overhead. |
| Breach check timeout | 4 seconds | `src/lib/breachCheck.ts` | The first call to the service took 2.6 s once. |
| `password123` in breaches | 2,266,543 times | `docs/breach-check.md` | The guide's test password. |
| Hash characters sent to the breach service | 5 | `docs/breach-check.md` | The k-anonymity rule. |

## Task 4: rate limits (`src/lib/rateLimitConfig.ts`)

| Route | Per address | Per email |
|---|---|---|
| ★ login | 20 per 15 minutes | 5 per 15 minutes |
| reset | 10 per hour | 3 per hour |
| register | 10 per hour | none |
| verify | 20 per 15 minutes | 10 per 15 minutes |
| resend | 10 per hour | 3 per hour |

Notes: the register limit of 10 an hour is **my number, not measured** (`docs/defects.md` O11). The store holds at most 10,000 counters in memory. A login email limit of 5 per 15 minutes means at most 480 guesses per account per day.

## Task 4: email verification

| Number | Value | Where | Why |
|---|---|---|---|
| Code | 6 digits, 1,000,000 possibilities | `src/lib/verification.ts` | `crypto.randomInt`. |
| Code lifetime | 10 minutes | `docs/verification-design.md` | Slow mobile data against attack surface. |
| Wrong tries per code | 5 | same | The cap is what stops guessing. |
| Guess chance per hour | 15 in 1,000,000 = 0.0015% | same | 5 tries x 3 new codes an hour. |
| Registration with the email queued | about 0.46 s | `evidence/18-registration-timing-sync-vs-job.txt` | The email is sent by the worker. |
| One email handed to Gmail | 2.1 to 2.5 s (2,500, 2,277, 2,142 ms) | same | Sending inside the request would cost about 2.8 s. |
| Gmail hang | 30 s ("Greeting never received") | `evidence/16a-smtp-network-timeout.txt` | Intermittent on my network. |
| Queue retries | 3, starting at 30 s, backing off | `src/lib/queue.ts` | |
| Job and queue | job takes 2.35 s, finished jobs deleted after 1 hour | `evidence/19c-real-run-database-state.txt`, `src/lib/queue.ts` | |
| Database | 9 tables of my own, 4 migrations | `prisma/schema.prisma`, `evidence/02b-database-state-now.png` | |

## Task 5: sessions (src/lib/sessionConfig.ts, docs/decisions.md)

| Number | Value | Where | Why |
|---|---|---|---|
| Patient session | 7 days (604,800 s) | `src/lib/sessionConfig.ts` | Patients book rarely on their own phones. |
| Admin session | 8 hours (28,800 s) | same | The front desk is a shared computer that sees every patient. |
| Session token | 32 random bytes, 43 characters in the cookie, SHA-256 stored (64 hex) | `src/lib/session.ts`, `evidence/01a-login-session-checks.txt` | 256 bits of randomness: nothing to guess. |
| Cookie flags | `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` except on localhost | same | Decision 1 in `docs/decisions.md`. |
| Login timing, wrong password against unknown email | 136 ms against 135 ms (medians of 10) | `evidence/01a-login-session-checks.txt` | The dummy hash makes them the same. |

## Still to add in Task 5

Session length, cookie flags, the deletion grace period, the job interval and purge counts, and the two session token IDs. Add each one here as I decide it, with the reason.
