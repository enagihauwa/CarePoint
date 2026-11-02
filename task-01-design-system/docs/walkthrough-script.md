# Walkthrough script (4 minutes): three type-scale values

Draft talking points for `evidence/13-walkthrough.mp4`. Say them in your own words. Every number below is from `type-scale.md`.

## 0:00 – 0:30 Open
- Show `docs/type-scale.md` and the home screen side by side.
- "This is CarePoint Clinic's type scale: 15 styles, all DM Sans, generated into `tokens.css` and used on the screen through `.type-*` classes."

## 0:30 – 1:40 Value 1: line height is 1.5 for every style
- Point at the table: Body Large is 16px with 24px line height; Display Large is 64px with 96px.
- Why: patients read on small phones, and some are unwell or worried. Open spacing makes lines easier to follow.
- The trade-off: 1.5 is loose for large display text. The hero uses Display Small, 40px with 60px, and I would test 1.2 or 1.3 for Display styles.
- The situation where it would be wrong: dense admin tables for front-desk staff, where 1.5 wastes space.

## 1:40 – 2:50 Value 2: Display Large letter spacing is -3.5%
- Show `evidence/03-spacing-default.png` (0%) and `evidence/04-spacing-chosen.png` (-3.5%).
- Why: at 64px the default spacing looks loose, and tightening makes it denser and more confident with no letters touching.
- Why it is not applied everywhere: I first put negative spacing on every style without testing. Small text needs normal spacing, so Body and Label stay at 0% and Title is only -0.5%.
- The situation where it would be wrong: very large text at a narrow width, where tight spacing hurts readability.

## 2:50 – 3:40 Value 3: nothing is below 12px
- Label Small was 11px and Label Medium was 12px. I raised them to 12px and 13px. Body Small is also 12px.
- Why: low-cost Android phones in bright daylight, with small text hard to read.
- The situation where it would be wrong: a screen with a lot of information that needs the extra room, where 12px labels may feel too big.

## 3:40 – 4:00 Close
- "The screen uses these through classes only. The one open item is that spacing and radius are not tokens yet (defect 3), which I fix in Task 2."

## Before you record
- Run `npm run tokens` live and show the output (57 roles, 15 type styles, 3 shadows).
- Be ready to say that the agent wrote the script and built the screen from your tokens.
- Do not claim you tested every weight, because `divergences.md` says you did not.
