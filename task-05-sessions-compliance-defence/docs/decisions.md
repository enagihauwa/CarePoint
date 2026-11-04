# Task 5 decisions

Recorded 4 November 2026. **Drafted by Claude.** Claude proposed each choice with its reason, and I accepted them all ("accept all"). The reasons below come from CarePoint's own situation (a private clinic in Lagos, patients on low-cost Android phones with slow or unstable data, and one front-desk admin on a shared computer). Each number stays mine only if I can defend its reason in a viva, so I need to read each one and change any I do not believe.

| # | Decision | Choice | Reason from my business | Accepted consequence |
|---|---|---|---|---|
| 1 | `SameSite` | **Lax** | Patients will open CarePoint from links in emails and WhatsApp messages. Strict would log them out on each such click. Lax still stops cross-site `POST`s, and everything that changes data is a `POST`. I will also check the `Origin` header on those routes. | A link on another site can make the browser send the cookie on a plain page visit, so no `GET` may ever change data. |
| 2 | Session length | **7 days for patients, 8 hours for the admin** | Patients book rarely on their own phones and do not want to log in each time. The front desk sees every patient and uses a shared computer, so a stolen cookie must be worth less: one working day. | A stolen patient cookie works for up to 7 days unless the patient logs out, resets the password or requests deletion. |
| 3 | Gating | **Soft** shipped, **hard** built on a branch | A first-time patient on a slow phone should see doctors and services before meeting a wall. The site asks for an account only when confirming a booking, and keeps what was typed. | Some people will type a booking and then not sign up. |
| 4 | Login before the email is verified | **Allowed, but booking is blocked until verified** | My mail lands in Spam and the worker is started by hand. Blocking login would lock out honest patients whenever either fails. | Someone can register with another person's email and log in as an unverified account. It can neither book nor see anything, and the real owner gets the "someone tried to register" notice. |
| 5 | Deletion grace period | **14 days**, purge job **once a day at night** | A patient who asks by accident can cancel. Pending bookings and payments have time to settle. Still prompt enough for "without undue delay". | Personal data stays, in anonymised form, for up to 14 days after the request. |
| 6 | Admin-only action | **Record a payment as paid** | It is the front desk's real job, and it uses what Task 4 built: `Payment`, an append-only `PaymentEvent`, and "recorded by". A patient who opens the admin address gets a 403. | Payment rows are kept after a deletion request (conflict to write up in `retention-matrix.md`). The legal retention period must be checked by me, not assumed. |

## Open question, raised by Claude because two of my files disagree

**Decided 4 November 2026: the pg-boss schedule** (I accepted Claude's suggestion). Original question: `AGENT-RULES.md` names **node-cron** for the scheduled purge. The Task 5 checklist says "node-cron **or** a pg-boss schedule". My own Task 4 code already runs a pg-boss worker. I chose pg-boss. The node-cron line in `AGENT-RULES.md` therefore no longer matches what I build, and I should update it.

Claude's suggestion is the pg-boss schedule: it is already installed, it keeps its state in PostgreSQL so a restart does not lose the schedule, and it needs no second scheduler. The cost is that the purge only runs while the worker is running (`npm run worker`).
