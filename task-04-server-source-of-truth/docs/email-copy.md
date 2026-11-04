# Verification email: styling and copy

Drafted by Claude at my request, so the wording is not all mine. I need to reword the "What I would change" section in my own voice. Code: `src/lib/email/verificationEmail.ts`. Colours, sizes and corner radius come from my Task 1 tokens through `scripts/email-tokens.js`.

## What was captured, and what was not

- `evidence/23-email-render-claude-capture.png`: the email rendered in **headless Chrome**, run by Claude Code at my request, with a **sample** code (`048213`) and a **placeholder** expiry of 10 minutes. Nothing was sent.
- `evidence/23a-email-wrong-first-render-claude-capture.png`: the **first, wrong** render, kept on purpose.
- `evidence/23b-email-in-real-inbox.png`: **my own screenshot** of the email opened in a real Gmail inbox (cropped to the email body, so the sender and my address are not shown). It matches the Chrome render: same colours, sizes, spacing and rounded corners. The font is the Arial fallback, as expected.
- **It landed in Spam**, not the Inbox (reported by me, opened on a laptop in the Gmail web page). So a patient may not see it unless they look there. A brand-new sending account with no history is a likely reason, but I have not proved that.
- **Still not checked:** a phone, Outlook or any other mail app. The sample email was sent twice to test addresses, the first to a mistyped address that bounced (`docs/verification-design.md`).

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
4. **Spam.** Because the first real email went to Spam, the sign-up page should tell patients to check their Spam folder. This is not in the email's own text, because a message that lands in Spam is never read. It belongs on the page.
