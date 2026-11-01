# Defects found in Task 1

Each defect was found by reading `screen/index.html`, `screen/screen.css` and `src/styles/tokens.css` on 2026-11-01. Line numbers are from the files as they stood after the fixes below.

## Fixed

| # | Defect | Where | Fix |
|---|---|---|---|
| 1 | The "Book an appointment" button linked to `#book`, and nothing on the page has that id, so the main call to action went nowhere. | `screen/index.html:26` | Now links to `#services`, the section about booking questions. The real booking route does not exist yet and arrives in Task 2. |
| 2 | The "Contact" nav link jumped to the fictional-clinic notice, which holds no contact details. | `screen/index.html:18` and `:47` | Renamed the link to "About" and the section id from `contact` to `about`, so the label matches the content. |
| 5 | The logo linked to `/`, which opened the drive root when the page is opened as a file. | `screen/index.html:15` | Now links to `#`, which stays on the page. In the real app it will point to the home route. |

`evidence/10-screen-with-system.png` was taken before fix 2 and still shows "Contact" in the nav. I left the screenshot as it was, since it records the state at the time.

## Open (deferred)

| # | Defect | Where | Why it is open |
|---|---|---|---|
| 3 | Spacing and radius are hard-coded rem values in a page-local `:root`, not tokens. The raw-value search covers colours only, so these were not caught. | `screen/screen.css:6-10` | Needs the spacing collection exported from Figma and added to the token script. |
| 4 | The button hover uses `--color-on-primary-container` as a background. That role is meant for text on a primary container. It works today (it resolves to Primary 30, with good contrast against white), but it is the wrong role, and a palette change could break it without warning. | `screen/screen.css:64` | Needs a proper hover role or state layer in the token set. |
| 6 | The font loads from the Google Fonts CDN. Offline or on a slow connection the text first shows in the `system-ui` fallback and then shifts. | `screen/index.html:7-9`, fallback in `src/styles/tokens.css:322` | The app in Task 2 should self-host the font. |
| 7 | The hero heading is a fixed 40px and does not scale on larger screens. | `screen/index.html:24` | Already recorded in `evidence/08-agent-typography-answer.txt` as planned for Task 2. |

## Production cost if each had shipped

1. Lost bookings. The button is the one thing the clinic needs the page to do, and it would have done nothing.
2. Patients looking for a way to reach the clinic land on a disclaimer. Every missed contact is a missed or confused patient.
3. Spacing drifts as pages are added. A change to the spacing scale means editing every copied value by hand, and some will be missed.
4. A later palette change could make the hover state unreadable, and nothing would warn us because the role name suggests a different use.
5. A dead logo link in the prototype. Low cost, but it is the first thing people click to go home.
6. A layout shift on first load, worse on slow mobile data, and every visit sends a request to a third party (Google) from the patient's browser.
7. On wide desktop screens the heading stays small and the page hierarchy looks weak. Low cost.

## Checked and not a defect

- No colour role in `tokens.css` is a raw hex; every role references a `--palette-*` variable.
- The heading order is h1, h2, h3, h2, which is valid.
- Dark-mode hover contrast is fine.
- `screen-without-system/` contains raw values on purpose, and its README says so.
