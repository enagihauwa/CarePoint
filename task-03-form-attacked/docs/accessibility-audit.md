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
| A0 | **Risk, not confirmed.** The page's first HTML already contains an alert, "The booking form has not finished loading...". Narrator did not read it in my run, so it may only matter for a slow connection or another screen reader. | `src/app/book/BookingForm.tsx:133-138` | A screen-reader user could hear a scary error on a healthy page. |
| A6 | **Found by Narrator, not by the automated checks.** The Date and time field is read as five separate spin buttons (day, month, year, hours, minutes), and the year allows up to 275760. | `BookingForm.tsx:122-125` (`type="datetime-local"`) | A blind patient has to set five separate numbers to choose a time, which is slow and confusing. |
| A1 | Field errors are not in a live region, so a screen reader is not told when they appear. **Confirmed with Narrator:** only the general alert ("some fields are missing or invalid") was read, and none of the field messages. | `BookingForm.tsx:77-80` | A blind patient knows something is wrong but not which field or why. |
| A2 | An error is plain red text with no icon, and hint text is grey text of the same size, so the two differ only by colour. | `BookingForm.tsx:79`, `src/styles/book.css:29` | A colour-blind patient may not tell an error from a hint. |
| A3 | After a failed submit, focus is not moved to the first problem. In the automated run it was on the page body. | `BookingForm.tsx:24-56` | A keyboard or screen-reader user must hunt for the error from the top of the page. |
| A4 | The submit button uses the `disabled` attribute while saving (and before the script loads), so it leaves the tab order and focus is dropped. | `BookingForm.tsx:140-141` | A keyboard user loses their place every time they press the button. |
| A5 | After a successful booking, the form is replaced by the confirmation, but focus is not moved to it. | `BookingForm.tsx:58-74` | A keyboard or screen-reader user is left on nothing and may not know the booking was made. |
| B1 | The terms link opens in the same tab, so following it loses everything typed in the form. | `src/components/auth/fields.tsx:130` | Anyone who wants to read the terms before agreeing, which is the point of the link. |

## Fixes applied

The fixes were made **after** my "before" listening, in commit `fix the accessibility problems found in the audit`. Automated "after" evidence: `evidence/22-claude-accessibility-checks-after.txt` (0 problems, the same checks that found 7 before) and `evidence/22-claude-booking-form-after.txt` (a real booking returned 201 and focus moved to the confirmation). These are Claude's automated checks, not a screen-reader test.

What was done for each problem:

- **A0:** the "not finished loading" message is plain text now, not an alert. The button is still really `disabled` until the script has loaded, so a form whose script never loaded cannot submit by itself (the Task 2 false-success fix).
- **A1, A2, A3:** each error sits in a live region with a caution icon plus text, the same pieces as the sign-up form, and focus moves to the first problem after a failed submit.
- **A4:** once the script has loaded, the button uses `aria-disabled` while saving and not `disabled`, so it stays in the tab order and focus stays on it.
- **A5:** focus moves to the confirmation heading after a successful booking.
- **B1:** the terms link opens in a new tab, and its text says so ("terms and privacy notice (opens in a new tab)").
- **A6 (reduced, not solved):** a hint under the Date and time label now says it has five parts and how to change them. The real fix is to let the patient choose from a list of available slots, which belongs to later work on availability. It stays on the defects list.

## Screen reader, BEFORE the fixes

Screen reader used: Windows Narrator, in Chrome. Page: `/book`, unfixed. Listened to on 3 November 2026. These are my own notes, copied as I wrote them. The words in square brackets are marks added later.

| Field | What was announced, exactly |
|---|---|
| Page load | "Carepoint", "Book an appointment", "Choose a doctor and a time that suits you. No payment is needed to book". The "has not finished loading" alert (A0) was **not** read in this run. |
| Group | "Your detail group" |
| Full name | "full name", "Edit required". (My first listen had an extra word after "required" that I could not make out. It did not come back the second time.) |
| Phone number | "Phone number", "Edit required", then "we'll call this number to confirm your visit required" |
| Group | "Appointment group" |
| Doctor | "Doctor", "Choose a doctor", "Combo box collapse required" |
| Date and time | Five separate controls: "Data Date and Time, Spin bottom zero, minimum 1 maximum 31"; "month date and time, Spin bottom zero, minimum 1 maximum 12"; "year date and time, Spin bottom zero, minimum 0 maximum 275760"; "hours date and time, Spin bottom zero, minimum 0 maximum 23"; "minutes date and time, Spin bottom zero, minimum 0 maximum 59" |
| Book appointment button | "Book appointment button" |
| After pressing it with empty fields | "book appointment", then "some fields are missing or invalid". No individual field error was read, and I did not note where the cursor went. |

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
