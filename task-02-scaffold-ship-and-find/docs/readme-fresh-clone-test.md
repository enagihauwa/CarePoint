# Fresh-clone test of the README

Run by **Claude Code on my machine on 3 November 2026**, at my request. It is a real run with real output (`evidence/22-fresh-clone-run.txt`), but it was **not** done by another person, so it does not replace `docs/readme-test.md`, which still needs a real friend. It follows the "simulated" review I saved earlier (`docs/readme-review-simulated.md`), which did not run anything.

## What was done

1. Cloned the repo into an empty folder and followed the README's getting-started steps in order.
2. Used a throwaway database, `carepoint_fresh_clone`, because `carepoint` already exists on my machine, and port 3066 for the dev server.
3. Sent a test booking with dummy details, then checked the row in the throwaway database.
4. Deleted the clone and dropped the throwaway database. My real `carepoint` database was not touched.

## Where it got stuck, verbatim

| Step | What happened | Cause | Fix |
|---|---|---|---|
| `npx prisma generate`, as the README ordered it | `Failed to load config file ... Error: PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL.` | The README ran `generate` before `.env` existed, and `prisma.config.ts` requires `DATABASE_URL` even for `generate`. | README reordered: create `.env` first, then `generate`. |
| `GET /book` in the dev server | `TypeError: Invalid URL at module evaluation (src\app\layout.tsx:13:17)` and `GET /book 500` | `.env.example` has `SITE_URL=`, so the copied `.env` held an empty string. `process.env.SITE_URL ?? "..."` did not fall back, and `new URL("")` threw. | `layout.tsx:10` now uses `\|\|`. |

## What worked

- `npm install`: 181 packages, 0 vulnerabilities.
- `.env.example` copied to `.env` and `DATABASE_URL` was read, so the byte-order-mark fix works.
- `npx prisma migrate deploy` applied both migrations, and `npx prisma db seed` printed `Seeded 5 doctors.`
- After the `SITE_URL` fix, `GET /book` and `GET /` both returned 200, and `/book` contained the form fields and all five doctors.
- `POST /api/bookings` returned `201`, and the row was in the database.

## What this does not prove

- That a person who has never used Node, Git or PostgreSQL can follow it. I had all three installed.
- That the steps work on another operating system.
- That the browser form works from a fresh clone. I tested the page's HTML and the API with `curl`, not the form in a browser.
