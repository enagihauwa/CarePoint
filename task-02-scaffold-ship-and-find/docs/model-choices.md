# Model choices

Drafted by Claude at my request from what is recorded in the repo and in my Claude Code session records, so the wording is not all mine.

## Which model did which job

| Job | Agent and model | Evidence |
|---|---|---|
| Task 2 scaffold (Next.js setup, minimal home screen) | Claude Code, Claude Sonnet 5.5 | Session `99a5ad4e…`, 2026-11-02 08:00 UTC; `evidence/01-agent-plan.txt`, `evidence/02-files-created.txt` |
| Task 2 booking form, API, Prisma models and doctor seed | Claude Code, Claude Opus 5.5 | Session `89ec5ed9…`; `src/app/book/`, `src/app/api/bookings/route.ts`, `prisma/` |
| Task 2 information design (Step 10: titles, tags, favicon, body fixes) | Claude Code, Claude Sonnet 5.5 | Branch `feature/information-design`; `docs/information-design.md` |

I first remembered the scaffold as Opus 5.5. The session record shows every reply in the scaffold session on 2 November came from Claude Sonnet 5.5, so the table follows the record.

## What I observed

**Scaffold (Sonnet 5.5).** It stopped and asked five questions before writing code, which was what my prompt asked for. It listed no assumptions in its plan, only questions. To obey "no hardcoded values" it wrote widths as multiples of a spacing variable (`calc(var(--space-4) * 24)`), which works but misuses a spacing token as a width, and it replaced the `20ch` heading width with a rem value. It said honestly that it had not looked at the page in a browser.

**Form (Opus 5.5).** It read the context files, summarised and waited. It asked me four decisions (Prisma version, date storage, validation scope, permission to install) and chose the stable Prisma 7.10.1 over a release candidate. It caught one of its own hardcoded values (`opacity: 0.6`) before I did. But its first version of the form had no `method` and could be submitted before its script loaded. When I opened the page on my network address, that produced a false success: the page reloaded, nothing was saved, and a name and phone number went into the URL and the server log (`docs/false-success.md`). It fixed this after I approved the fix.

**Information design (Sonnet 5.5).** It read the real `<head>` of both pages after building and caught its own doubled title ("Book an appointment | CarePoint Clinic | CarePoint Clinic"), then fixed it in its own commit. When I asked for the "wrapping badly" screenshot, it ran the experiment and reported that this short heading does not wrap badly, instead of staging a bad example. It could not open DevTools, so it saved the head tags as text and said that the two DevTools screenshots were still mine to take. It needed three numbers that no design token can express (`20ch`, `6vw` and a 1.5 ratio), and it put them in the one documented exception file.

## Where I chose wrong and switched

I switched my working session from Sonnet 5.5 to Opus 5.5 for the booking form, the step with the database, the API and the honest-error rules. While testing the form I also switched to Sonnet 5.5 and straight back to Opus 5.5. Both switches happened together, with no work done on Sonnet 5.5 in between, so it changed nothing in the code. I did not record a reason for it.

My other mistake was in my own record-keeping: I remembered the scaffold model wrongly. Checking the session record, not my memory, is what caught it.
