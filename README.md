# CarePoint Clinic

CarePoint Clinic is a fictional private clinic in Lagos, Nigeria: a booking app where a patient picks a doctor, a date and a time, and the booking is saved in a database.

Drafted by Claude at my request from the repo and from checks it ran, so the wording is not all mine.

## Status

Updated 6 November 2026. Tasks 1 to 4 are built. **Task 5 (sessions, compliance, defence) is in progress**: sessions, login, logout, password reset, booking for logged-in patients, the front-desk payment page and account deletion with a nightly purge are built. State management is not, and my own evidence for the newest pieces is not taken yet (`task-05-sessions-compliance-defence/README.md`).

**Built, and checked on my machine**
- The design system is generated into `src/styles/tokens.css` by `npm run tokens`. Task 1 notes are in `task-01-design-system/`.
- The home page (`/`) and the booking page (`/book`) use only those tokens, apart from the few documented exceptions in `src/styles/spacing.css`. Task 2 notes are in `task-02-scaffold-ship-and-find/`.
- Sign-up, log-in and reset forms with browser-side rules, and an accessibility audit (`task-03-client-validation/`).
- **The server checks everything itself** (`task-04-server-security/`): the same rules as the form on the server, a request size limit, rate limits, a breach check on new passwords, Argon2id password hashing, and a nine-table database designed on paper and migrated by hand.
- **Email verification works end to end:** a 6-digit code is emailed through Gmail by a background worker (pg-boss, in the same PostgreSQL), and the sign-up page asks for it. Checked once for real on my own inbox (`task-04-server-security/evidence/19c` to `19e`).
- **Log in, log out and sessions work** (`task-05-sessions-compliance-defence/`): a random token whose hash is stored, a cookie with `HttpOnly` and `SameSite=Lax`, 7 days for patients, one message for every failed login, and logout that deletes the session. Each was seen in my own browser.
- **Password reset works**: an emailed code, a new password, and every session of that user ends. Seen in my own browser with two windows.
- **Booking works for a logged-in patient with a verified email.** A visitor can look and choose first, and is asked to log in when they confirm. **This was tested by Claude Code over HTTP and in a headless browser. I have not yet booked an appointment myself.**
- **Front-desk staff can record a payment as paid** on `/admin`. The staff account can only be made by running `npm run create-admin`: the website cannot make one. A patient who opens `/admin` gets a real HTTP 403. **Tested by Claude Code, not yet by me.**
- **A patient can delete their account.** It is scheduled for 14 days, and they can log in and cancel. A nightly job (02:00 Lagos time, run by the worker) then anonymises it in one transaction: name, email and phone are removed, and the booking and payment records are kept without them. **Tested by Claude Code, not yet by me, and the migration for it is prepared but not applied to my database.**
- The five doctors are seed data in `prisma/seed.ts`.

**Followed from a fresh clone, but not yet by another person**
- On 3 November, and again on 4 November (`task-04-server-security/evidence/24-fresh-clone-run.txt`), Claude Code cloned the repo and followed this README on an empty database. The second run found that the README did not mention `VERIFICATION_SECRET`, so the worker failed. That is now in the steps below. It was not a person, so a friend still has to follow the whole README (`task-02-scaffold-ship-and-find/docs/readme-test.md`, not written yet).

**Not built, or not working**
- Anything that **creates a payment for a booking** on its own, and **correcting** a payment typed wrongly. Staff type the amount; no price list was invented.
- **How long booking and payment records are kept** after an account is purged: not decided, and the legal period must be checked by me.
- **State management** (the last Task 5 piece).
- The worker has to be started by hand (`npm run worker`), and **restarted after code changes**. Nothing restarts it.
- Mail from the test Gmail account lands in Spam. A real sending domain is not set up.

## Stack, and why

| Piece | Used for |
|---|---|
| Next.js 16, React 19, TypeScript | One project for the pages and the API. Pages are rendered on the server, which suits patients on slow phones and data. |
| PostgreSQL 18 with Prisma 7.10.1 | A bookings table where a row is either there or not. Prisma keeps the schema and the migrations in the repo. |
| Zod 4.6.7 | Checks the booking request in the API. |
| `tsx` | Runs the seed script. |
| `scripts/tokens-to-css.js` | Turns the Figma token exports into CSS. |

Also installed: `argon2` (Argon2id password hashing), `nodemailer` (Gmail SMTP) and `pg-boss` (the job queue in PostgreSQL). `AGENT-RULES.md` still names node-cron for the scheduled purge, but I chose a pg-boss schedule, so node-cron will not be installed.

## Getting started

You need Node.js with npm (I used 24.16.0, from https://nodejs.org), Git and a running PostgreSQL (I used 18). To check what you have, run `node -v`, `npm -v` and `psql --version`.

```bash
git clone https://github.com/enagihauwa/CarePoint.git
cd CarePoint
npm install
```

Create an empty database called `carepoint`. With the command line (it asks for your PostgreSQL password; in pgAdmin you can also right-click Databases and choose Create):

```bash
psql -U postgres -c "CREATE DATABASE carepoint;"
```

Then create a file called `.env` in the main `CarePoint` folder, next to `package.json`. Copy `.env.example` and fill in `DATABASE_URL`:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/carepoint"
```

Replace `USER` and `PASSWORD` with your own PostgreSQL user name and password (the user is often `postgres`). Keep `carepoint` at the end, because that is the database you just created.

To try email verification you also need two more things in `.env`. Without them the site still runs, but no email is sent and the worker fails:

```
VERIFICATION_SECRET="a random string of at least 32 characters"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="the Gmail address that sends the codes"
SMTP_PASSWORD="a Gmail APP password, not the normal password"
SMTP_FROM="the same Gmail address"
```

Make the secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. An app password needs 2-step verification on the Gmail account (myaccount.google.com/apppasswords). Gmail refuses the normal password. `npm run test-email` checks that the login works and sends nothing.

To make the front-desk (admin) account, add `ADMIN_EMAIL` and `ADMIN_PASSWORD` (and optionally `ADMIN_NAME`) to `.env` and run `npm run create-admin` once. **Then delete `ADMIN_PASSWORD` from `.env`.** The script refuses a weak password and will not change an account that already exists.

Now run these, **in this order**. `prisma generate` needs `DATABASE_URL` to exist, so it has to come after you create `.env`:

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

In a **second terminal**, in the same folder, start the worker that sends the emails: `npm run worker`. The first time it starts, pg-boss creates its own `pgboss` tables in the database.

`generate` builds the code the app uses to talk to the database. `migrate deploy` builds the tables in your empty database from the migration files in `prisma/migrations/`. `db seed` fills in the five doctors, so the booking form has doctors to choose from.

`migrate deploy` applies **every** migration in order, so after pulling new code run it again **before** you start the app: the newest code reads columns the older database does not have. The nightly purge can be run by hand with `npm run purge-now`.

Open **`http://localhost:3000/book`** to book, or **`http://localhost:3000/auth?mode=signup`** to create an account first. After logging in, **`/account`** shows your details and a Log out button. Use `localhost`, not the "Network" address that `npm run dev` prints. On the network address the development server blocks the form's script, and a booking silently does nothing (`task-02-scaffold-ship-and-find/docs/false-success.md`).

To check a booking really saved, run `npx prisma studio`. It opens a page in your browser (the address is printed in the terminal). Click the `Booking` table on the left, and your booking should be a row with an `id` and a `createdAt` time.

## Environment variable names

Set in `.env`, which git ignores. Only the names are in `.env.example`.

- `DATABASE_URL`: the PostgreSQL connection string. Required.
- `SITE_URL`: the public address, used for the canonical and Open Graph links. Optional, it defaults to `http://localhost:3000`.
- `VERIFICATION_SECRET`: at least 32 characters. Keys the hash of each emailed code. Needed by the worker. Anyone who has it and a copy of the database could work out codes, so it stays in `.env`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: the Gmail account that sends the codes. `SMTP_PASSWORD` is an app password.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`: only for `npm run create-admin`. Remove the password once the account exists.

## What it deliberately does not do

From `AGENT-RULES.md` and `docs/business-brief.md`:
- No payment gateway. A payment is only recorded as pending or paid, afterwards.
- No doctor login and no admin editing of doctors. Doctors are seed data.
- No doctor notes, no lab processing, and no lab results. A result is only a status such as "processing" or "ready".
- No running of database migrations by the AI agent. I run them by hand.

## Known defects

| Defect | Where |
|---|---|
| Booking checks only the format of the date and time. **Past dates and times outside opening hours are accepted**: those are business rules I have not defined. | `src/app/api/bookings/route.ts` |
| One patient can book any number of free slots. No limit has been chosen. | `src/app/api/bookings/route.ts` |
| A new page that forgets to call `getCurrentUser()` is unprotected, because the proxy only checks that a cookie exists. | `src/proxy.ts`, `src/lib/currentUser.ts` |
| A payment typed with the wrong amount cannot be corrected: there is no edit or undo. | `src/app/api/admin/payments/route.ts` |
| Booking and payment records are kept for ever after an account is purged, because the retention period is not decided. Nobody is emailed about a deletion request. | `src/jobs/purgeDeletedAccounts.ts` |
| When the database is down, the booking page shows an error but still answers HTTP 200. A check that only reads status codes would call it healthy. | `src/app/book/page.tsx:45` |
| Several widths are written as multiples of `--space-4` because no width tokens exist. It works, but a spacing token is being used as a width. | `src/styles/home.css:43`, `:55`, `:71`, `:79`; `src/styles/book.css:8` |
| Three values are not design tokens (`20ch`, `6vw` and the 1.5 line-height ratio), plus the Task 1 spacing and radius values. | `src/styles/spacing.css` |
| Only the Latin subset of DM Sans is self-hosted, so accented characters outside it fall back to `system-ui`. | `src/styles/fonts.css:9` |
| The canonical and Open Graph addresses say `localhost` until `SITE_URL` is set. There is no Open Graph preview image. | `src/app/layout.tsx:10` |

Task 1 defects are in `task-01-design-system/docs/defects.md`, Task 3 in `task-03-client-validation/docs/defects.md` and Task 4 in `task-04-server-security/docs/defects.md`. What Task 5 left out on purpose is in `task-05-sessions-compliance-defence/docs/not-implemented.md`.

## Links

- Pull request for the information design work: https://github.com/enagihauwa/CarePoint/pull/1
- Task 1: `task-01-design-system/`
- Task 2 notes and evidence: `task-02-scaffold-ship-and-find/`
- Task 3: `task-03-client-validation/`
- Task 4: `task-04-server-security/`
- Task 5: `task-05-sessions-compliance-defence/`
