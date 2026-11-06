# Task 5: not implemented, on purpose

Started 5 November 2026. **Drafted by Claude from what was built and left out.** I must read each line, say whether it is a gap I accept, and add what I know is missing.

| What | Why it is not there | Where it shows |
|---|---|---|
| **No "your password was changed" email** to the owner | Out of the brief's scope for a reset. If someone resets a password, the real owner is not told afterwards. | `docs/password-reset.md` |
| **Nothing creates a `Payment` row for a booking** | "Record a payment as paid" (piece 5) needs a payment to exist, and the booking route does not make one. Must be settled in piece 5. | `src/app/api/bookings/route.ts` |
| **No opening hours and no "not in the past" rule** for bookings | They are business rules I have not defined, and Claude must not invent them. Only the format of the date and time is checked, and a doctor's slot cannot be booked twice (the database enforces it). | `src/app/api/bookings/route.ts` |
| **No limit on how many bookings one patient can make** | No business number chosen. One patient could take many slots. | same |
| **No cancel or reschedule** | Not in the brief. | |
| **The "is this account active" check is missing from `getCurrentUser()`** | `User.status` arrives with account deletion (piece 6). | `src/lib/currentUser.ts` |
| **`server-only` is not installed** | The Next.js guide suggests it so a helper cannot be imported into browser code by mistake. Adding a dependency is my choice. | `src/lib/currentUser.ts` |
| **The proxy covers only `/account` and `/admin`** | `/book` is public by design (soft gating). Each protected page must also call `getCurrentUser()` itself. A page that forgets is open. | `src/proxy.ts` |
| **The `Origin` check runs on logout, booking and recording a payment only** | Those are the routes that change data for a logged-in person. Login, register and reset have no session to abuse. | `src/lib/session.ts` (`sameOrigin`) |
| **The table is still called `EmailVerification` and the queue `send-verification-email`**, though both now carry reset codes | A name debt, not a bug. | `prisma/schema.prisma` |
| **A wrong payment amount cannot be corrected** | Staff type the amount. There is no edit or undo: a correction would need a new event, which I did not design. A payment recorded wrongly stays wrong. | `src/app/api/admin/payments/route.ts` |
| **No price list is used when recording a payment** | I would have had to invent prices. The `Service` table exists and is empty. | `prisma/schema.prisma` |
| **Admin accounts are made only by a script, and there is no admin screen to manage them** | No admin screens beyond payments. The normal password reset works for an admin whose email is real. | `scripts/create-admin.ts` |
| **Nobody is emailed about a deletion**: not when it is requested, not when it is cancelled, not when the purge happens | Out of scope. Someone with a stolen session and the password could schedule a deletion and the real owner would not be told. | `src/app/api/account/delete/route.ts` |
| **The kept booking and payment records are never deleted** | I have not decided how long the clinic must keep them. That is a legal question for me to check, not a number to invent. | `src/jobs/purgeDeletedAccounts.ts`, `retention-matrix.md` (mine, not written) |
| **No copy of a patient's data can be downloaded** | Not in the brief. | |
| **Backups and database logs are not purged** | There are none made by this project. A real deployment would need a rule. | |
| **Patient-facing wording about deletion is a draft** | The account page says what is removed and what is kept. It must be checked against `privacy.md`, which is mine to write. | `src/app/account/AccountDeletion.tsx` |
| **The new migration must be applied before the new code runs** | `getCurrentUser()` reads the whole user row, so a database without `User.status` fails every logged-in request. | `prisma/migrations/20261105180000_add_account_status` |
| **The draft booking is kept per tab** (`sessionStorage`), so it is lost if the tab is closed before logging in | The simplest storage that keeps nothing between visits and holds nothing personal. | `src/app/book/BookingForm.tsx` |
