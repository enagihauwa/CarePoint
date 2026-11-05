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
| **The proxy covers only `/account`** | `/book` is public by design (soft gating). Each protected page must also call `getCurrentUser()` itself. A page that forgets is open. | `src/proxy.ts` |
| **The `Origin` check runs on logout and booking only** | Those are the routes that change data for a logged-in person. Login, register and reset have no session to abuse. | `src/lib/session.ts` (`sameOrigin`) |
| **The table is still called `EmailVerification` and the queue `send-verification-email`**, though both now carry reset codes | A name debt, not a bug. | `prisma/schema.prisma` |
| **The draft booking is kept per tab** (`sessionStorage`), so it is lost if the tab is closed before logging in | The simplest storage that keeps nothing between visits and holds nothing personal. | `src/app/book/BookingForm.tsx` |
