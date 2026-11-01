# Type scale: CarePoint Clinic

Font family: DM Sans for all 15 styles.

Line height rule: line height = font size x 1.5 for every style.

| Role | Size | Style | Family | Weight | Size (px) | Line height (px) | Letter spacing |
|---|---|---|---|---|---|---|---|
| Display | Large | Display Large | DM Sans | Semibold | 64 | 96 | -3.5% |
| Display | Medium | Display Medium | DM Sans | Semibold | 50 | 75 | -3% |
| Display | Small | Display Small | DM Sans | Semibold | 40 | 60 | -2% |
| Headline | Large | Headline Large | DM Sans | Medium | 32 | 48 | -1.5% |
| Headline | Medium | Headline Medium | DM Sans | Medium | 28 | 42 | -1.75% |
| Headline | Small | Headline Small | DM Sans | Medium | 24 | 36 | -1.75% |
| Title | Large | Title Large | DM Sans | Medium | 22 | 33 | -0.5% |
| Title | Medium | Title Medium | DM Sans | Medium | 16 | 24 | -0.5% |
| Title | Small | Title Small | DM Sans | Medium | 14 | 21 | -0.5% |
| Body | Large | Body Large | DM Sans | Regular | 16 | 24 | 0% |
| Body | Medium | Body Medium | DM Sans | Regular | 14 | 21 | 0% |
| Body | Small | Body Small | DM Sans | Regular | 12 | 18 | 0% |
| Label | Large | Label Large | DM Sans | Medium | 14 | 21 | 0% |
| Label | Medium | Label Medium | DM Sans | Medium | 13 | 19.5 | 0% |
| Label | Small | Label Small | DM Sans | Medium | 12 | 18 | 0% |

## Line-height multiplier per role

All five roles use 1.5.

I chose 1.5 for every role to give the text enough breathing room and make it easier to read, especially for users on small phones with varying reading ability.

## Minimum size

Label Small was 11px and Label Medium was 12px. I raised them to 12px and 13px because small text on low-cost Android phones in daylight needs a larger floor. Body Small is also 12px. Nothing in the scale is below 12px.

## Letter spacing

I first applied negative letter spacing to every style by following one consistent pattern, without testing each style. I then realised that negative spacing suits large text, so Display (-3.5% to -2%) and Headline (-1.5% to -1.75%) stay tight. Title is only lightly tightened (-0.5%), and Body and Label use 0% because small text needs normal spacing to stay readable on small screens.

## Display Large spacing comparison

In the chosen version (`evidence/04-spacing-chosen.png`), the letters in "Display Large" sit closer together because I changed the letter spacing from 0% (`evidence/03-spacing-default.png`) to -3.5%. This makes the text look tighter, denser and more confident. The letters remain clear, with no obvious overlapping or collisions, so I prefer the chosen version.
