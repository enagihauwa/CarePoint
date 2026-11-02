# Model choices

Drafted by Claude at my request from what is recorded in the repo and the session, so the wording is not all mine.

## Which model did which job

| Job | Agent and model | Evidence |
|---|---|---|
| Task 1 guidance, docs and the token script | Claude Code, Claude Sonnet 5.5 | Session record |
| Task 2 scaffold (Next.js setup, minimal home screen) | Claude, Claude Opus 5.5 | `evidence/01-agent-plan.txt`, `evidence/02-files-created.txt` |
| Task 2 booking form, API, Prisma models and doctor seed | Claude Code, Claude Opus 5.5 | `src/app/book/`, `src/app/api/bookings/route.ts`, `prisma/` |
| Task 2 information design (Step 10) | Planned: Claude Sonnet 5.5 | Not done yet |

## What I observed

**Scaffold (Opus 5.5).** It stopped and asked five questions before writing code, which was what I asked for. It listed no assumptions in its plan, only questions. To obey "no hardcoded values" it wrote widths as multiples of a spacing variable (`calc(var(--space-4) * 24)`), which works but misuses a spacing token as a width, and it replaced the `20ch` heading width with a rem value. It said honestly that it had not looked at the page in a browser.

**Form (Opus 5.5).** It read the context files, summarised and waited. It asked me four decisions (Prisma version, date storage, validation scope, permission to install) and chose the stable Prisma 7.10.1 over a release candidate. It caught one of its own hardcoded values (`opacity: 0.6`) before I did. But its first version of the form had no `method` and could be submitted before its script loaded. When I opened the page on my network address, that produced a false success: the page reloaded, nothing was saved, and my name and phone number went into the URL and the server log (`docs/false-success.md`). It fixed this after I approved the fix.

## Where I chose wrong

The guide asks for one model for the scaffold and a different one for a later feature. I used Claude Opus 5.5 for both the scaffold and the form, so I did not meet that. I am correcting it by using Claude Sonnet 5.5 for the next feature, the information design work in Step 10, and I will record what I observe there.

The session record also shows I switched the model from Opus 5.5 to Sonnet 5.5 and straight back to Opus 5.5 while testing the form. [ADD in your own words: why you switched, or say you were trying the command.]
