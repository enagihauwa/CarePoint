# Accessibility audit

Drafted by Claude at my request from reading the code and from automated checks, so the wording is not all mine. The sections marked **[ME]** are for what I hear with a real screen reader. Claude cannot do those, and they are left empty on purpose.

Forms audited: the booking form (`/book`, built in Task 2) and the sign-up form (`/auth?mode=signup`, built in Task 3). The booking form was built before these checks existed, so it gives an honest "before". The sign-up form was built with them in mind, so it is mostly a check that they hold.

Evidence of the unfixed state: `evidence/21-claude-accessibility-checks-before.txt` (automated, headless Chrome, **not** a screen reader).

## Method

Each field is checked against five things: **colour independence** (is anything shown by colour alone?), **keyboard** (can it be reached and used with Tab, Space and Enter?), **focus visibility** (can you see where you are?), **screen-reader announcement** (does it have a name, role and state?) and **error association** (is an error tied to its field and announced?).

## Field by field: booking form (before the fixes)

| Field | Colour independence | Keyboard | Focus visibility | Announcement | Error association |
|---|---|---|---|---|---|
| Full name | Error is red text only, no icon (A2) | Reachable | Visible outline (`book.css:41`) | Label and `required` present | Linked with `aria-describedby`, but the error is not announced when it appears (A1) |
| Phone number | Same as above | Reachable | Visible | Label, hint and `required` present | Same as above |
| Doctor (select) | Same as above | Reachable | Visible | Label and `required` present | Same as above |
| Date and time | Same as above | Reachable | Visible | Label and `required` present | Same as above |
| Book appointment (button) | Greyed out while unavailable | **Leaves the tab order while disabled, and focus is dropped while saving (A4)** | Visible (`home.css`) | Name present. **The success confirmation is not announced and focus is lost (A5).** | After a failed submit focus stays nowhere (A3) |

## Field by field: sign-up form

| Field | Colour independence | Keyboard | Focus visibility | Announcement | Error association |
|---|---|---|---|---|---|
| Name, email, phone, password | Every error has a caution icon plus text | Reachable | Visible | Label, `aria-required` present | `aria-describedby` to hint and error, error slot is a live region |
| Show password button | Text says Show or Hide | Reachable | Visible | Name changes to "Hide password" | n/a |
| Terms checkbox | Error has icon plus text | Space ticks it | Visible | `aria-required` present | Linked to its error slot. **The terms link opens in the same tab and loses what was typed (B1).** |
| Create account (button) | Grey while not ready | Stays in the tab order (`aria-disabled`) | Visible | Explains why when pressed, focus moves to the first problem | n/a |

This sign-up result comes from the code and from 43 automated browser checks (`evidence/20-claude-browser-behaviour-test.txt`). It is not yet confirmed with a screen reader.

## Real problems found (all open)

| # | Problem | Where | Who it hurts |
|---|---|---|---|
| A0 | The page's first HTML already contains an alert, "The booking form has not finished loading...", so a screen reader may read it every time the page opens. | `src/app/book/BookingForm.tsx:133-138` | A screen-reader user hears a scary error on a healthy page. |
| A1 | Field errors are not in a live region, so a screen reader is not told when they appear. | `BookingForm.tsx:77-80` | A blind patient submits, hears nothing, and does not know anything went wrong. |
| A2 | An error is plain red text with no icon, and hint text is grey text of the same size, so the two differ only by colour. | `BookingForm.tsx:79`, `src/styles/book.css:29` | A colour-blind patient may not tell an error from a hint. |
| A3 | After a failed submit, focus is not moved to the first problem. In the automated run it was on the page body. | `BookingForm.tsx:24-56` | A keyboard or screen-reader user must hunt for the error from the top of the page. |
| A4 | The submit button uses the `disabled` attribute while saving (and before the script loads), so it leaves the tab order and focus is dropped. | `BookingForm.tsx:140-141` | A keyboard user loses their place every time they press the button. |
| A5 | After a successful booking, the form is replaced by the confirmation, but focus is not moved to it. | `BookingForm.tsx:58-74` | A keyboard or screen-reader user is left on nothing and may not know the booking was made. |
| B1 | The terms link opens in the same tab, so following it loses everything typed in the form. | `src/components/auth/fields.tsx:130` | Anyone who wants to read the terms before agreeing, which is the point of the link. |

## Planned fixes (not applied yet)

I have not changed anything, so the "before" listening below is honest.

- **A0:** show the "not finished loading" message only after the browser has had time to start the script, and not as an alert.
- **A1, A3:** put each error in a live region with a caution icon, and move focus to the first problem after a failed submit.
- **A2:** give booking errors the same caution icon and text as the sign-up form.
- **A4:** use `aria-disabled` and not `disabled`, keep the button in the tab order, and keep focus on it while saving.
- **A5:** move focus to the confirmation heading after a successful booking.
- **B1:** open the terms link in a new tab, and say so in the link text.

## Screen reader, BEFORE the fixes **[ME]**

Screen reader used: **[ME: Narrator, NVDA or TalkBack, and the browser]**. Page: `/book`.

| Field | What was announced, exactly |
|---|---|
| Page load | [ME] |
| Full name | [ME] |
| Phone number | [ME] |
| Doctor | [ME] |
| Date and time | [ME] |
| Book appointment button | [ME] |
| After pressing it with empty fields | [ME] |

## Screen reader, AFTER the fixes **[ME]**

| Field | What was announced, exactly |
|---|---|
| Page load | [ME] |
| Full name | [ME] |
| Phone number | [ME] |
| Doctor | [ME] |
| Date and time | [ME] |
| Book appointment button | [ME] |
| After pressing it with empty fields | [ME] |
