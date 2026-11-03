# Task 2: scaffold, ship and find

Task 2 built the first working CarePoint app: a Next.js scaffold, a minimal
home page, and a booking form that saves a row to PostgreSQL. It also records
five things that went wrong and how each one was found.

Drafted by Claude at my request from the files in this folder, so the wording
is not all mine.

## What this task contains

- **Scaffold.** Next.js 16 with React 19 and TypeScript, DM Sans self-hosted
  through `next/font`, and a home screen built from Task 1's design tokens.
- **Booking.** The `/book` page, `POST /api/bookings`, a Prisma `Booking`
  model and five seeded doctors. A booking is saved, or the page says it was
  not saved.
- **Information design.** Page titles, SEO and Open Graph tags, a favicon, and
  the smaller copy and layout fixes listed in the information design note.
- **Findings.** A deliberate 404, a false success on a network address, a
  database failure, the working tree pipeline, and the first-load timings.

The full app setup (database, migrations, seed, `npm run dev`) is in the
[root README](../README.md#getting-started).

## Documents

| Note | What it covers |
|---|---|
| [`docs/scaffold-prompt.md`](docs/scaffold-prompt.md) | The prompt I gave the agent for the scaffold, my approval message, and the assumptions the plan left out. |
| [`docs/model-choices.md`](docs/model-choices.md) | Which model did which job, what I observed, and where I switched or remembered wrong. |
| [`docs/404-investigation.md`](docs/404-investigation.md) | How I found the cause of `/book` returning 404, check by check. |
| [`docs/false-success.md`](docs/false-success.md) | A booking that looked successful but was never saved, and why. |
| [`docs/performance-note.md`](docs/performance-note.md) | First-load measurements and what I ruled out. |
| [`docs/working-tree.md`](docs/working-tree.md) | The working tree pipeline, explained from my hand drawing. |
| [`docs/information-design.md`](docs/information-design.md) | The head tags, titles, favicon and body fixes, with where each lives. |

## Evidence

All files are in [`evidence/`](evidence/). The numbers match the order of the
work.

| Files | What they show |
|---|---|
| `01`–`04` | The agent plan, files created, server start and first page load. |
| `05`–`08` | A nested-folder mistake, a port already in use, and both fixes. |
| `09`–`10` | The 404 on `/book`: browser, console, server log, and the network tab after the fix. |
| `11`–`13` | A false success on a network address, real saves in Prisma Studio, and a deliberately broken database. |
| `14` | My hand drawing of the working tree pipeline. |
| `15` | `git log` before and after deleting a branch. |
| `16`–`21` | Information design: the `<head>` of both pages, heading width, and responsive widths. |

## Status

Built and checked on my machine. The checks are in the documents and evidence
above. There is no production site, and Tasks 3 to 5 are not built.
