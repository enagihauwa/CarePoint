# Rate limiting

Drafted by Claude at my request from the code and the evidence, so the wording is not all mine. Evidence: `evidence/13-rate-limit-triggered.txt`, `13b-rate-limit-regression.txt`, `13c-rate-limit-logic-checks.txt` and `14-rate-limit-defeated.txt`. Claude ran every test on a production build against a throwaway database that was dropped afterwards. My own screenshot of the refusal (`13-rate-limit-triggered.png`) is still to be taken.

## What it protects against

Rate limiting counts requests from one source in a time window and refuses the extras. CarePoint needs it for four reasons:

- **Password guessing on login.** Without a limit, one account can be attacked with thousands of guesses.
- **The cost of hashing (`docs/hashing.md`).** One Argon2id hash took about 77 ms on my machine and uses 64 MiB of memory. Unlimited login attempts are also a way to use up the server's processor and memory.
- **Reset flooding.** Anyone could make the server send reset emails to a victim's inbox.
- **Registration spam**, which fills the database with junk accounts.

Protected: `POST /api/register`, `/api/login` and `/api/reset` (`src/lib/rateLimit.ts`, the three routes).

**Not protected yet:** `/api/bookings`, where anyone can spam bookings, and the email verification endpoint planned for step 10, which will need a tight limit because a 6-digit code has only a million possibilities.

## The numbers and why

All numbers are in one file, `src/lib/rateLimitConfig.ts`. Every attempt is counted, successful or not, because there are no accounts yet to tell them apart.

| Endpoint | Counted by | Limit | Reason |
|---|---|---|---|
| Login | email | 5 per 15 minutes | A patient who mistypes needs a few tries. An attacker gets at most 5 x 4 x 24 = **480 guesses per account per day**. |
| Login | address | 20 per 15 minutes | Generous, because many people can share one address (see below). |
| Reset | email | 3 per hour | Nobody needs more than a couple of reset emails an hour. It caps inbox flooding. |
| Reset | address | 10 per hour | Same shared-address reasoning. |
| Register | address | 10 per hour | **My proposal, not derived from the clinic.** I was asked how many patients the front desk registers in an hour and have not measured it. |

The email is trimmed and lowercased before it is counted, and it is counted **whether or not an account exists**, so the limit can never reveal which emails are registered. `Ada@x.com` and `ada@x.com` share one counter (`13`, part B).

The window is a **fixed window counter**. Its weakness: a burst that straddles the end of one window and the start of the next can get up to twice the limit through.

## What the server answers

`HTTP 429 Too Many Requests`, a `Retry-After` header with the seconds until the window resets, and one generic message, "Too many attempts. Please try again later." It is **429, not 403**: 403 means "forbidden", and the request is fine, there are just too many. The message is the same whichever counter was hit, so it does not say whether it was the address or the email.

If the limiter itself fails, the request is refused with `503` and the same kind of generic message. I chose to **fail closed**, because login and reset are not urgent for a patient and the limiter exists to protect hashing and email. The cost is that a bug in it would block everyone. I tested it with a deliberately broken store (`13c`).

## Where the counters live

They are in **memory** in the server process. Options I weighed:

| Option | Why not, or why |
|---|---|
| **In memory (chosen)** | No new table, no database write for each attacker request, and it needs no schema change. |
| A PostgreSQL table | It survives restarts and is shared across servers, but every request, including an attacker's, becomes a database write, and it needs a new table and a migration. |
| A Postgres UNLOGGED table | Faster writes, but it is emptied after a crash and Prisma cannot declare it. |
| pg-boss | Not suitable: it is a job queue, not a counter store. |
| Redis | The usual choice, but it is not in my stack. |

**Limits of keeping them in memory:** the counters are lost on every restart or redeploy; each server instance counts on its own, so two instances give an attacker double the limit; and in development a code reload resets them, so I demonstrate on the production build. The store is capped at 10,000 counters (expired ones go first, then the oldest), so someone inventing endless emails cannot grow it without limit. 20,000 random emails left exactly 10,000 (`13c`). The upgrade path is a Postgres table once the schema exists or the app runs on more than one server.

## Why an address alone fails

1. **It can be changed.** The app reads the client's address from the `x-forwarded-for` header, which is the only place it can see it. Next.js fills that header from the real connection **only when the client did not send it** (`node_modules/next/dist/server/base-server.js:601`, the `??=` line). So a client can pick its own address. In `14` part A, **50 login requests, each claiming a different address, got 0 refusals**, where the same 50 from one real address would have stopped at the 21st. I do not trust the header to be true. Behind a proxy I control, I would take the address the proxy adds and ignore any value the client sent. The code uses the **last** value, which is the one a single trusted proxy appends, but on a direct connection that is still the client's choice.
2. **It can be shared.** Several staff at one reception desk, or many patients on one mobile network, can use one address. In `14` part C, one person used up the address's 20 attempts and a second patient on the same address was refused, while the same patient from his own address got through. That is why the address limits are generous.

## Other keys

- **The email (built).** In `14` part B, 6 requests for one email, each claiming a different address, still stopped at the 6th. An attacker who changes address cannot change the email they are attacking, so this is the part that holds.
- **A device fingerprint (not built).** It would be a second key that is harder to change, but it needs more code, it can be wrong, and it raises privacy questions. It belongs in `docs/not-implemented.md`.

## What a refusal looks like to a patient

When the register limit is used up, the sign-up form shows the refusal message and does **not** claim anything was saved, and nothing was saved (`13b`, part 3). This matters after the false success in Task 2.

## Still open

- The register numbers are a proposal until I know how many patients the front desk registers.
- Counters are lost on restart and are not shared across servers.
- The address can be spoofed on a direct connection.
- `/api/bookings` and the future verification endpoint are not limited yet.
