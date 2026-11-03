# Defects found in Task 2

Drafted by Claude at my request. Every item was checked against the files on 3 November 2026, and the line numbers are from the files as they stood then. Task 1 defects are in `task-01-design-system/docs/defects.md`.

## Fixed

| # | Defect | Where it was | What fixed it | Production cost if it had shipped |
|---|---|---|---|---|
| F1 | **False success.** On the network address the form's script was blocked, so the form sent a plain `GET` to `/book`, the page reloaded with no message, and nothing was saved. | `src/app/book/BookingForm.tsx` (no `method`, button always enabled) | The form now has `method="post"` (line 86), and the button stays disabled until the script has loaded (`useEffect` at line 19, `disabled={!ready ...}` at line 141). Success shows only after a `201`. Evidence: `docs/false-success.md`, `evidence/11a`. | Patients believe they have booked and turn up with no booking. Names and phone numbers also land in URLs and logs. |
| F2 | **A BOM at the start of `.env.example`.** Copying the file to `.env` (the README's step) made the first variable's name `\uFEFFDATABASE_URL`, so `DATABASE_URL` was not read. I tested this: with a BOM the real name is unset. | `.env.example:1` | The three BOM bytes were removed. | Every new developer or deployer gets a connection error that looks unrelated to the file. |

## Open

| # | Defect | Where | Production cost |
|---|---|---|---|
| O1 | **The same doctor, date and time can be booked twice.** Nothing in the database or the API prevents it. | `prisma/schema.prisma:20` (no unique constraint on `doctorId`, `date`, `time`), `src/app/api/bookings/route.ts:49` | Two patients arrive for the same slot, and the clinic has to turn one away. This is the "booking" the app exists to get right. |
| O2 | **Bad data is accepted.** Dates in the past and any text as a phone number are saved. Only "filled in" and "a real date" are checked. | `src/app/api/bookings/route.ts:7` (`filled`), `:10` (phone), `:12` (date) | Bookings in the past clutter the admin list, and the front desk cannot call a patient whose "phone number" is not a number. Task 3 is meant to fix this, with rules I choose. |
| O3 | **An error page answers HTTP 200.** When the database is down, `/book` shows "booking is unavailable" but the status is still 200. | `src/app/book/page.tsx:22` (returns `null`) and `:40` (the message) | A monitor or load balancer that reads only status codes would call the page healthy while patients cannot book. Evidence: `evidence/13-write-failed-logs.txt` (`GET /book 200`). |
| O4 | **The database accepts logins without a password.** My local PostgreSQL has `trust` for every user and address. | Outside the repo: `C:\Program Files\PostgreSQL\18\data\pg_hba.conf:113, :115, :117` | On a real server, anyone who could reach the database could read or change every booking. It was convenient on my laptop and must never be copied to production. |
| O5 | **The booking number is shown once and not saved anywhere.** The confirmation exists only in the page's state, and there is no email. | `src/app/book/BookingForm.tsx:62` | A patient who closes the page or reloads cannot find their booking number. Email confirmation is planned for a later task. |
| O6 | **The form only works on `localhost` in development.** On other addresses the dev server blocks its scripts. With F1 the form now says it has not loaded instead of failing silently, but it still cannot book there. | `next.config.ts:3` (no `allowedDevOrigins`) | I cannot test the form from a phone on my network without a setting I have not added. This affects development only, not production. |
| O7 | **Widths are written as multiples of a spacing token** because no width tokens exist. | `src/styles/home.css:43`, `:55`, `:71`, `:79`; `src/styles/book.css:8` | A change to the spacing scale would also change the page widths without anyone intending it. |
| O8 | **Three values are not design tokens:** `20ch`, `6vw` and the 1.5 line-height ratio, plus the Task 1 spacing and radius values. | `src/styles/spacing.css` | These live outside the system, so a design change must be made in two places. |
| O9 | **Only the Latin subset of DM Sans is self-hosted.** Characters outside it fall back to `system-ui`. | `src/styles/fonts.css:9` | A patient name with a character outside the subset would show in a different font, which looks unfinished. |
| O10 | **Canonical and Open Graph addresses say `localhost`** until `SITE_URL` is set, and there is no Open Graph preview image. | `src/app/layout.tsx:10` | If deployed without `SITE_URL`, search engines are told the canonical page is on someone's `localhost`. |

## Checked and not a defect

- The booking API returns `201` on success, `400` for bad input and `500` when the write fails (`evidence/11`, `evidence/13`). None of these claims success when nothing was saved.
- The database holds only dummy test data after I deleted the first two rows (booking numbers 1 and 2 were never reused, which is how a PostgreSQL sequence works).
- `.env` is ignored by git and never printed in the evidence.
