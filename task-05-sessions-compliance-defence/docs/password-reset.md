# Password reset

Written 5 November 2026. **Drafted by Claude from the code and the tests, so the wording is not all mine.** I chose option A (a `purpose` column on the existing code table) and approved the numbers by keeping the Task 4 ones. I must read this and change anything I do not believe.

## How it works

1. **Ask.** `POST /api/reset` with an email. The answer is always `202` with the same words, whether or not an account exists. If one does, a job goes on the queue and **the worker** makes a 6-digit code, stores only its keyed hash with `purpose = reset`, and emails the code.
2. **Use the code.** `POST /api/reset/confirm` with the email, the code and the new password. The password follows the registration rules and the breach check. If the code is right, **one transaction** does three things: the code is spent, the new Argon2id hash is stored, and **every session of that user is deleted**.
3. **Log in again.** There is no automatic login after a reset. Every session has just been ended, including the one that did the reset, so the person logs in with the new password.

## Numbers (all from Task 4, kept)

| Number | Value | Where |
|---|---|---|
| Code | 6 digits | `src/lib/verification.ts` |
| Lifetime | 10 minutes | same |
| Wrong tries per code | 5 | same |
| Reset emails | 3 per email per hour, 10 per address per hour | `src/lib/rateLimitConfig.ts` (`reset`) |
| Choosing a password | 10 per email, 20 per address, per 15 minutes | same (`resetConfirm`, new) |

The guess chance is 5 tries x 3 codes an hour = 15 in 1,000,000 an hour, or at most about 0.036% over a day of constant attacking. **A reset code is worth more than a verification code, because guessing it takes over an account.** I kept the numbers because my email lands in Spam and my patients' data is slow, so a shorter life would lock out honest people. That is a trade I must be able to defend.

## Rules that matter

- **A code works only for its own purpose.** `/api/verify` looks only at `verify` codes and `/api/reset/confirm` only at `reset` codes. Without that, a reset code could verify an email, or a verification code could reset a password. Asking for a new verification code also does **not** cancel a reset code in progress, and the other way round.
- **Every failure of the code gets one answer** ("That code is not right, or it has expired..."): wrong, expired, used, replaced, or no such account. It never says which.
- **A weak or breached password does not use up the code.** The password is checked first, so the person can pick another one without asking for a new code.
- **The placeholder account** (`unclaimed-bookings@example.invalid`) is never mailed and cannot be reset.

## Evidence

`evidence/11a-password-reset-checks.txt` (45 checks, run by Claude on a throwaway database, with a fake mailer). My own capture is evidence 11: two browsers, one reset, the other browser's session dead.

## Not built, on purpose

- **No "your password was changed" email** to the owner. If someone resets a password, the real owner is not told afterwards. This should go in `not-implemented.md`.
- **The table is still called `EmailVerification`** and the queue `send-verification-email`, though both now carry reset codes too. A name debt, not a bug.
- **Asking for a reset takes slightly different time** for an email with an account (a queue write) than for one without. The answer is identical, the time is not. Same weakness as `/api/verify/resend`.
- **The rate limiter's address check can be faked** (defect O5 in Task 4). The per-email limits are what hold.
