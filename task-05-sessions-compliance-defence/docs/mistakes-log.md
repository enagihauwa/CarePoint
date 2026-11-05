# Mistakes log

Started 4 November 2026. **Drafted by Claude from the repo, the documents and the git history, so the wording is not all mine.** Every entry has a file or commit that proves it. I must read each line, correct it, and **add the mistakes that are mine and that the commits do not show**. This is the notes file behind the handbook's "what I got wrong" parts, so it has to be real. Commit hashes are the ones after the history rewrite of 4 November (`docs/history-rewrite.md` in the Task 4 folder).

**Who** says whose mistake it was. "Me" means I made it. "Claude" means the agent did, and I only count it if I should have caught it.

| # | Task | Who | What went wrong | How it was found | The fix | Proof |
|---|---|---|---|---|---|---|
| 1 | 1 | Me | I applied negative letter spacing to every type style by one pattern, without testing each style. It suits large text and not small text. | I looked at the styles and realised. | Only Display and Headline stay tight. | `task-01-design-system/docs/type-scale.md`, section "Letter spacing" |
| 2 | 2 | Me | The README told a newcomer to run `prisma generate` before `.env` existed, and an empty `SITE_URL` crashed every page. | A fresh clone followed the README. | README reordered, the empty value handled. | commit `b24e91f`, `task-02-scaffold-ship-and-find/evidence/22-fresh-clone-run.txt` |
| 3 | 2 | Me | I wrote that the database held only dummy data. It held a real person's booking. | While cleaning up the booking rows. | The claim was corrected in `defects.md`. | commit `4a3a119` |
| 4 | 2 to 4 | Me | I committed an unredacted screenshot of the `Booking` table showing a real person's name. I redacted the file the next day, but the old copy stayed in git history, in a public repository, for two days. A sentence in an interview answer also named them and called the record "dummy". | I opened the old file on GitHub. | History rewritten, both branches force-pushed, a request sent to GitHub Support. | `task-04-server-security/docs/history-rewrite.md`, commit `8f0b93f` |
| 5 | 3 | Me | My rollback note said the reverted commit had been pushed. It had not: it was local only, and two later commits sat on top of it. | I checked where the commit really was. | The note was corrected. | commit `725c61b`, `task-03-client-validation/docs/rollback.md` |
| 6 | 3 | Me | A note gave the wrong reason for checking the login email only on submit. | Reading it again. | Corrected. Read the commit and put it in your own words. | commit `2750305` |
| 7 | 3 | Me (on purpose) | **An experiment, not an accident.** I lowered the password maximum to 6 characters, to practise a rollback, then reverted it. | The rollback exercise. | `git revert`, because later commits sat on top. | commits `f5eeebf` and `b5c9c5e` |
| 8 | 4 | Claude | I let the server read the whole request body before checking its 4 KB limit. A large request would use the memory first. | I asked what "enforced against the actual size" meant in practice. | It now stops reading at the limit. | `task-04-server-security/docs/validation-placement.md` |
| 9 | 4 | Claude | The Task 4 notes said "10 attacks" in one place and 19 in another. It was the same 19 attempts: 10 got through and 9 were blocked. | I asked whether the 10 were a subset of the 19. | Documents and the header of `evidence/12c` corrected. | `task-04-server-security/evidence/12c-regression-form-checks.txt` |
| 10 | 4 | Claude | My first hand-edited migration failed: my script split Prisma's SQL on blank lines and cut a `CREATE TABLE` in half. Prisma then recorded the migration as failed. | Postgres reported a syntax error. | `migrate resolve --rolled-back`, rebuilt the file. | `task-04-server-security/evidence/04a-migration-my-splitting-mistake.txt`, commit `bbe4b9d` |
| 11 | 4 | Me | I sent my first test email to `1.jiddahu93@gmail.com`: the `1.` was a list number from the chat, not part of the address. It bounced, and Gmail had already said `250 OK`. | A bounce in the sending inbox. | I sent it to the right address, and recorded that "sent" is not "delivered". | `task-04-server-security/evidence/17a-test-email-sent-claude-run.txt`, `docs/verification-design.md` |
| 12 | 4 | Claude | I blamed IPv6 for Gmail's timeouts after three runs in one order. With the order shuffled, the default settings worked too. I committed the change with a type error. | I re-ran in a different order. | Removed, and the real situation recorded: the connection is intermittent. | commit `d2c337d`, `task-04-server-security/evidence/16a-smtp-network-timeout.txt` |
| 13 | 4 | Claude | **The same mistake twice.** The email test script, then the worker, loaded `.env` after the imports had already read their settings. The worker connected to PostgreSQL as my Windows user and every verification job failed. **My tests passed because they set `DATABASE_URL` on the command line.** | I read the failed jobs in the queue table (`P1010 role "USER" denied`). | `scripts/loadEnv.ts` as the first import. | commit `47f7850`, `task-04-server-security/docs/verification-design.md`, `evidence/19c` |
| 14 | 4 | Claude | The root README did not mention `VERIFICATION_SECRET`, the SMTP settings or the worker. A fresh clone's worker failed. | A fresh clone followed the README. | README rewritten. | commit `d4d4343`, `task-04-server-security/evidence/24-fresh-clone-run.txt` |
| 15 | 5 | Claude | I decided whether to add the `Secure` cookie flag by reading the host from `request.url`. In this framework that always says `localhost`, so on a real host the session cookie would have been sendable over plain HTTP. | My own login test, which asks for a cookie from a non-localhost host, failed. | The host is now read from the `Host` header. | `task-05-sessions-compliance-defence/evidence/01a-login-session-checks.txt` (first run failed, second passed), `src/lib/session.ts` |
| 16 | 5 | Claude | My first test of logout logged in as one patient 8 times. Login allows 5 per email per 15 minutes, so the later logins were refused and my test went on with an **empty token**. Five checks failed, and several others, such as "the old token no longer works", **passed without proving anything**. | I read the failures and saw that the logout deleted 0 rows. | The test now stops if a login does not give a 43-character token, and each scenario has its own user. It runs again from a clean database. | `task-05-sessions-compliance-defence/evidence/06a-proxy-logout-checks.txt` (header), `06a-proxy-logout-script.ts` |

## Mistakes the commits do not show (add yours)

Write these in my own words. For each one: what I believed, what was true, how I found out.

-
-
-

## Patterns I can see so far

Drafted by Claude. Check them before using them.
- **Tests that share the bug's assumptions pass and prove nothing** (13, 16, and the earlier version of 14).
- **A claim written before it was checked, then corrected** (3, 5, 9).
- **Private data committed, because redacting the file later does not remove it from history** (4).
