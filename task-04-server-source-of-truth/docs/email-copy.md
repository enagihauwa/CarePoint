# Verification email: styling and copy

Drafted by Claude at my request, so the wording is not all mine. I need to reword the "What I would change" section in my own voice. Code: `src/lib/email/verificationEmail.ts`. Colours, sizes and corner radius come from my Task 1 tokens through `scripts/email-tokens.js`.

## What was captured, and what was not

- `evidence/23-email-render-claude-capture.png`: the email rendered in **headless Chrome**, run by Claude Code at my request, with a **sample** code (`048213`) and a **placeholder** expiry of 10 minutes. Nothing was sent.
- `evidence/23a-email-wrong-first-render-claude-capture.png`: the **first, wrong** render, kept on purpose.
- It was **not** tested in Gmail, Outlook or a phone. Chrome is more forgiving than those. I can only claim it renders correctly in Chrome. My own screenshot of the email arriving in a real inbox is still to be taken (after SMTP works in step 10).

## The wrong render, and what I traced it to

The first render had a serif font, no text colours, and no sizes or weights. Only the box and background looked right. The cause: the font list was written as `"DM Sans", Arial` with double quotes, and it sat inside a `style="..."` attribute that also uses double quotes. The first quote ended the attribute, so the browser dropped the rest of every text style. The fix was single quotes (`'DM Sans'`). A browser reported nothing, which is why I had to look at the output.

## How the tokens reach the email

Email apps often ignore `var(--color-primary)` and external stylesheets. So `scripts/email-tokens.js` reads `tokens.css` and `spacing.css`, follows each role to its real value (for example `--color-primary` to `#1D38E2`), converts rem to px, and writes `emailTokens.generated.ts`. The template then writes plain values inline, and the rendered HTML contains no `var(`. If the tokens change, I run `npm run tokens`, then `node scripts/email-tokens.js`.

Two limits: the email is light theme only (no dark-mode roles), and DM Sans only shows for readers who have it installed, so most will see the Arial fallback.

## What I would change in the copy (drafted by Claude, still to be reworded by me)

1. **The subject line.** "Your CarePoint Clinic verification code" does not say what the code is for. "Your CarePoint code to confirm your email" tells a patient why it arrived before they open it.
2. **The "did not ask for this" line.** It is small and last. A worried patient should see it sooner, and it could say who to contact. I have no clinic phone number in the project, so I would add the real one rather than invent one.
3. **The expiry.** "10 minutes" is a placeholder. I will set the real figure in step 10 and update the email to match.

Not checked: how a screen reader reads the code with its wide letter spacing.
