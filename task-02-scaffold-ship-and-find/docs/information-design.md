# Information design

Drafted by Claude (Sonnet 5.5) at my request from the code and the checks it ran, so the wording is not all mine. Work is on the branch `feature/information-design`.

## The head

| Item | What I did | Where |
|---|---|---|
| Title per route | Home: "CarePoint Clinic: Book your visit now. Pay when you're ready." `/book`: "Book an appointment \| CarePoint Clinic" (a template in the layout adds the site name) | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/book/page.tsx` |
| Tagline | "Book your visit now. Pay when you're ready." (8 words, under the limit of 10). Shown above the home heading and used in the title. | `src/app/page.tsx` |
| SEO tags | A description and a canonical address, on the home page only. `/book` has neither. | `src/app/page.tsx` |
| Open Graph tags | title, description, url, site name, locale (`en_NG`) and type, on the home page only. No preview image yet, because it would need a designed 1200x630 picture. | `src/app/page.tsx` |
| Favicon | My own shield icon (51x51 px), served at `/favicon.ico` and as `icon.png` | `src/app/favicon.ico`, `src/app/icon.png` |

The canonical and Open Graph addresses currently read `http://localhost:3000`, because the site has no real address. They come from a `SITE_URL` setting (named in `.env.example`) for when it does.

## The body

- **Removed one thing that should not be there:** the "CarePoint Clinic is a fictional clinic ... design prototype" notice, and the About link that pointed at it. It spoke to examiners, not patients. The footer still says "(fictional)".
- **Collapsed one choice:** date and time on the booking form are now one "Date and time" field. The page splits the value before sending it, so the API and database are unchanged.
- **Heading width:** the hero heading has `max-width: 20ch`. The scaffold had replaced this with a rem value.
- **Button padding in rem:** both buttons use `var(--space-2) var(--space-3)`, which is `1rem 1.5rem`.
- **Label typography on every button:** both buttons ("Book an appointment" on the home page, "Book appointment" on the form) use `type-label-large`.
- **Pointer cursor and visible hover:** buttons, nav links, the logo (pointer and underline), the doctor dropdown and the date picker.
- **The logo links home:** to `/`.
- **Responsive heading with `clamp()`:** the heading's size goes between the Headline Small and Display Small sizes, following `6vw`, and never grows beyond Display Small. Line height is set at 1.5 times the size, so a smaller heading does not keep the large size's line height.

## Numbers that are not tokens

Three values have no design token, so they are declared once in `src/styles/spacing.css`, with the existing temporary exception, and nowhere else: `--heading-measure: 20ch`, `--fluid-heading: 6vw` and `--line-height-ratio: 1.5`. A raw-value search over the rest of `src/` finds nothing.

## Evidence, and its limits

| File | What it is |
|---|---|
| `evidence/16-head-route-one.png`, `17-head-route-two.png` | My own DevTools Elements screenshots of the `<head>` of `/` and `/book`, taken in my browser. The home page head has the title, description, canonical link and Open Graph tags. The `/book` head has only a title and the icons, which shows the SEO tags are on the marketing page only. |
| `evidence/16-head-route-one.txt`, `17-head-route-two.txt` | The same two heads as text, read with `curl` by Claude against a production build. A supplement to the screenshots. |
| `evidence/18-heading-without-limit.png` | The home page with the width limit temporarily removed, rendered by Claude in headless Chrome at 1280 px. **It does not show bad wrapping.** I also tried 600 px and 800 px. The heading is short, so it fits on one line at 1280 px (about 36 characters) and breaks the same way as before at 600 px. The limit protects longer headings, but this one does not show the problem. |
| `evidence/19-heading-with-ch-limit.png` | The page as it is now, at 800 px, rendered in headless Chrome |
| `evidence/20-responsive-three-widths.png` | The page at 360, 768 and 1280 px side by side, rendered in headless Chrome. The heading shrinks on the phone and the cards go from one column to two to three. |

I did not look at the pages in my own browser for this step.
