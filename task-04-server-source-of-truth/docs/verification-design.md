# Email verification: design (before any code)

Drafted by Claude at my request, so the wording is not all mine. **Status: waiting for my approval. Nothing here is built.** The four decisions in the first table are mine. Everything else is Claude's proposal for me to accept or change.

## My decisions

| Decision | Choice |
|---|---|
| How long a code is valid | **10 minutes** |
| Wrong tries per code | **5**, then the code is dead and a new one must be requested |
| Sending account | A **new Gmail account made only for CarePoint**, using an app password |
| pg-boss creates its own tables in `carepoint` | **Yes**, and `schema.md` must say so |

## Why 10 minutes (user need against attack surface)

- **The patient:** the email has to arrive, and the patient has to open it and come back. On slow mobile data in Lagos that can take a few minutes. A 5-minute code would expire on some patients.
- **The attacker:** a 6-digit code has 1,000,000 possibilities. A code that lives longer gives more time to guess, and a longer window for someone who can see the patient's email to use it. 10 minutes is short enough that an unused code is worthless by the time anyone could misuse it.
- **What the limits make of it.** With 5 tries per code and at most 3 new codes per hour for one email (below), an attacker gets at most 15 guesses an hour against 1,000,000 possibilities. That is a 0.0015% chance per hour, about 0.036% over a whole day. The expiry is not what protects the code. The tries limit and the rate limit are, and the expiry only bounds how long a leaked code is useful.

## Making the code

- `crypto.randomInt(0, 1_000_000)`, written with leading zeros to 6 digits (`048213`, not `48213`). `Math.random` is not used. It is not designed to be unpredictable, so someone who saw a few outputs could work out later ones. `randomInt` uses the operating system's secure random source.
- **A 6-digit code is only as safe as the limits around it.** Anyone can try all 1,000,000 in seconds if nothing stops them. So the guess limit is part of the design, not an extra.

## Storing the code

- Only a hash is stored (`EmailVerification.codeHash`), never the code.
- **A plain hash of a 6-digit code is useless protection.** Anyone with a copy of the database could try all 1,000,000 codes against it in under a second. So the hash is an **HMAC-SHA-256 keyed with a secret held only in `.env`** (`VERIFICATION_SECRET`). A stolen database alone cannot be used to find the code.
- Argon2id is not used here. It is built to slow down guessing of passwords people choose. A 6-digit code is too small a space for it to help, and it would add about 77 ms to every attempt for no gain.

## The flow

1. **Register.** The server creates the user (unverified) as it does now, puts a job on the queue, and **answers straight away** with the same message as today. It does not wait for the email.
2. **The job** (run by a separate worker process) generates the code, stores its HMAC with `expiresAt` 10 minutes ahead, sends the email, and marks any older unused codes for that user as used. **The code is created inside the job, so the plaintext never sits in the queue's tables.** Only the user's id is in the job.
3. **Verify** (`POST /api/verify`, email and code). The server finds that user's newest code that is unused and unexpired, adds one to `attempts`, and compares in constant time. On a match it sets `usedAt` and `User.emailVerifiedAt` in one transaction. On a miss with `attempts` at 5, it sets `usedAt`, so the code is dead.
4. **Resend** (`POST /api/verify/resend`). Queues a new job. The newest code is the only one that can work.
5. **Duplicate registration.** The job sends the real owner an email saying someone tried to register their address, and there is no code in it. That tells the owner what the response deliberately does not tell the person typing (`docs/enumeration.md`).

Every verify and resend answer is generic ("Check the code and try again"), so it never reveals whether an email has an account.

## Limits

| Route | Per address | Per email |
|---|---|---|
| verify | 20 per 15 minutes | 10 per 15 minutes |
| resend | 10 per hour | 3 per hour |

These numbers are Claude's proposal, derived as above and not measured. The existing limiter and its weaknesses apply: the address key can be faked and the counters live in memory (`docs/rate-limiting.md`). **The per-email and per-code limits are what hold** (`evidence/14`).

## The queue and the email

- **Queue:** pg-boss, in my existing PostgreSQL. No Redis. It creates its own schema and tables the first time it starts, outside my Prisma migrations. The worker is a separate process (`npm run worker`), not part of the Next.js server, so a slow or failing email cannot stall a web request.
- **Retries:** 3 attempts with a growing delay, then the job is marked failed. The patient can use Resend either way.
- **Sending:** `nodemailer` with Gmail SMTP. Host and port are recorded in the evidence when I configure it. The account's address and app password live only in `.env` (`SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`), and `.env.example` names them with no values.
- **The first attempt is expected to fail.** I will try the account's normal password, capture Gmail's rejection (`evidence/16`), then switch to an app password (`17`). This needs 2-step verification on the Gmail account.
- **Timing (`18`):** registration response time with the email sent inside the request, against queued in the job.

## The email

The template is the one in `src/lib/email/verificationEmail.ts`, with the placeholder 10 minutes now real. The copy changes in `docs/email-copy.md` are made when I reword that file.

## Known weaknesses I am accepting

- **The job can send twice.** If the worker dies after sending but before it records success, the job runs again and sends a second code. The newest code wins, so this only costs a duplicate email.
- **A queued email can be lost** if the database is down when the job is added. The patient can use Resend.
- **The verification state is not used yet.** Nothing checks `emailVerifiedAt` until login exists (Task 5).
- **Someone who can read the patient's email can verify the account.** Email verification proves access to the inbox and nothing more.
- **Reuse.** A used code is marked with `usedAt` and cannot be accepted again. The brief asks me to document a reuse defect if I have one, and I will test that and report what I find, whichever way.

## Evidence plan

`16` Gmail rejecting the normal password, `17` the app password working, `18` registration time with and without the queue, `19` the stored row (a hash, not the code), `20` an expired code refused, `21` a wrong code refused and counted, `22` a used code refused a second time, `23` the email (done, `23`).

## Files this will add or change

`src/lib/email/` (sender), `src/lib/verification.ts` (make and check codes), `src/app/api/verify/route.ts`, `src/app/api/verify/resend/route.ts`, `scripts/worker.ts`, the sign-up form (a code step and a corrected message), `.env.example`, `schema.md` (pg-boss tables) and `package.json` (`pg-boss`, `nodemailer`).
