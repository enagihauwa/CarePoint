# Token export notes

## First export: `evidence/05-tokens-incomplete.json` (without Figma variables)

I noticed that the exported tokens did not fully reflect my CarePoint design system when I compared them with my Figma variables and styles; my pinned Primary 40 colour, secondary and tertiary colours, warning and success colours, typography, shadows and colour-role references were missing or different.

## Second export: `evidence/06-tokens-complete-*.json` (with Figma variables)

The complete export is saved as three files, because Figma's built-in variable export does not include text styles or effect styles:

- `06-tokens-complete-roles.json` (Colour Roles variables)
- `06-tokens-complete-primitives.json` (Primitives variables)
- `06-tokens-complete-typography-shadows.json` (text and effect styles, exported with Tokens Studio for Figma)

The complete export now reflects my CarePoint design system more accurately. My colour roles reference the defined primitives, while my typography styles and shadow effects are included in a separate file, making the design tokens more complete and consistent with my Figma work.
