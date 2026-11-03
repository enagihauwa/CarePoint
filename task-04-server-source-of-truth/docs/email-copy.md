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

## What I would change in the copy (DRAFT, I rewrite this)

- The subject says "verification code" but does not say what it is for. Something like "Your CarePoint code to confirm your email" would be clearer in an inbox list.
- The email should say what happens if the patient did not ask for it. It does, but the line is small and last. 
- The expiry "10 minutes" is a placeholder until I choose it in step 10.
- "Hello Sample Patient" uses the full name. A first name may read friendlier, but my form collects one name field, so I cannot split it reliably.
- There is no clinic phone number or address for a patient who is worried it is fake. I have not added invented contact details.
- The code itself is not in the plain-text part with any formatting issue, but I have not checked how a screen reader reads "0 4 8 2 1 3" with the wide letter spacing. That is untested.
