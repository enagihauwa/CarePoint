# CarePoint Clinic

CarePoint Clinic is a fictional private clinic in Lagos, Nigeria: a booking app where a patient picks a doctor, a date and a time, and the booking is saved in a database.

Drafted by Claude at my request from the repo and from checks it ran, so the wording is not all mine.

## Status

Updated 3 November 2026. Only Tasks 1 and 2 have been built.

**Built, and checked on my machine**
- The design system (colour roles, 15 type styles, 3 shadows) is generated into `src/styles/tokens.css` by `npm run tokens`. Task 1 notes are in `task-01-design-system/`.
- The home page (`/`) and the booking page (`/book`) use only those tokens, apart from the few documented exceptions in `src/styles/spacing.css`.
- The booking form saves a row through `POST /api/bookings`. I booked twice and checked each booking in the server log (`POST /api/bookings 201`) and in Prisma Studio (`task-02-scaffold-ship-and-find/evidence/11`, `12`).
- With the database connection broken on purpose, a booking returns `500` and the page says nothing was booked (`evidence/13-write-failed-logs.txt`).
- The five doctors are seed data in `prisma/seed.ts`.
- Each page has its own title. The home page has the SEO and Open Graph tags. Both pages have a favicon.

**Followed from a fresh clone, but not yet by another person**
- On 3 November Claude Code cloned the repo, followed the getting-started steps on an empty database and sent a test booking (`task-02-scaffold-ship-and-find/evidence/22-fresh-clone-run.txt`). That run found two bugs, both now fixed: `prisma generate` was listed before `.env` existed, and an empty `SITE_URL` crashed every page. It was not a person, so a friend still has to follow the whole README (`docs/readme-test.md`, not written yet).

**Not built**
- Patient accounts, login and passwords, the admin dashboard, payment records, the lab-result status, email confirmations and the job queue. These are Tasks 3 to 5 and their folders are empty.
- Real validation. The booking form only checks that every field is filled in and that the date is a real date.

## Stack, and why

| Piece | Used for |
|---|---|
| Next.js 16, React 19, TypeScript | One project for the pages and the API. Pages are rendered on the server, which suits patients on slow phones and data. |
| PostgreSQL 18 with Prisma 7.10.1 | A bookings table where a row is either there or not. Prisma keeps the schema and the migrations in the repo. |
| Zod 4.6.7 | Checks the booking request in the API. |
| `tsx` | Runs the seed script. |
| `scripts/tokens-to-css.js` | Turns the Figma token exports into CSS. |

Planned in `AGENT-RULES.md`, **not installed yet**: Argon2id, Nodemailer, pg-boss and node-cron.

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

Now run these, **in this order**. `prisma generate` needs `DATABASE_URL` to exist, so it has to come after you create `.env`:

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

`generate` builds the code the app uses to talk to the database. `migrate deploy` builds the tables in your empty database from the migration files in `prisma/migrations/`. `db seed` fills in the five doctors, so the booking form has doctors to choose from.

Open **`http://localhost:3000/book`**. Use `localhost`, not the "Network" address that `npm run dev` prints. On the network address the development server blocks the form's script, and a booking silently does nothing (`task-02-scaffold-ship-and-find/docs/false-success.md`).

To check a booking really saved, run `npx prisma studio`. It opens a page in your browser (the address is printed in the terminal). Click the `Booking` table on the left, and your booking should be a row with an `id` and a `createdAt` time.

## Environment variable names

Set in `.env`, which git ignores. Only the names are in `.env.example`.

- `DATABASE_URL`: the PostgreSQL connection string. Required.
- `SITE_URL`: the public address, used for the canonical and Open Graph links. Optional, it defaults to `http://localhost:3000`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: for email. Listed for later, not used yet.

## What it deliberately does not do

From `AGENT-RULES.md` and `docs/business-brief.md`:
- No payment gateway. A payment is only recorded as pending or paid, afterwards.
- No doctor login and no admin editing of doctors. Doctors are seed data.
- No doctor notes, no lab processing, and no lab results. A result is only a status such as "processing" or "ready".
- No running of database migrations by the AI agent. I run them by hand.

## Known defects

| Defect | Where |
|---|---|
| The same doctor, date and time can be booked twice. Nothing in the database or the API prevents it. | `prisma/schema.prisma:20`, `src/app/api/bookings/route.ts:8` |
| Dates in the past and any phone text are accepted. Only "filled in" and "a real date" are checked. | `src/app/api/bookings/route.ts:10`, `:12` |
| When the database is down, the booking page shows an error but still answers HTTP 200. A check that only reads status codes would call it healthy. | `src/app/book/page.tsx:40` |
| Several widths are written as multiples of `--space-4` because no width tokens exist. It works, but a spacing token is being used as a width. | `src/styles/home.css:43`, `:55`, `:71`, `:79`; `src/styles/book.css:8` |
| Three values are not design tokens (`20ch`, `6vw` and the 1.5 line-height ratio), plus the Task 1 spacing and radius values. | `src/styles/spacing.css` |
| Only the Latin subset of DM Sans is self-hosted, so accented characters outside it fall back to `system-ui`. | `src/styles/fonts.css:9` |
| The canonical and Open Graph addresses say `localhost` until `SITE_URL` is set. There is no Open Graph preview image. | `src/app/layout.tsx:10` |

Task 1 defects are in `task-01-design-system/docs/defects.md`.

## Links

- Pull request for the information design work: https://github.com/enagihauwa/CarePoint/pull/1
- Task 1: `task-01-design-system/`
- Task 2 notes and evidence: `task-02-scaffold-ship-and-find/`
