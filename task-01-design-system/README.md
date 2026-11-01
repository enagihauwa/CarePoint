# Task 1: Design system for CarePoint Clinic

CarePoint Clinic is a fictional private clinic in Lagos, Nigeria (see `../docs/business-brief.md`). This task builds its design system in Figma, exports it as tokens, generates CSS variables from those tokens, and proves that a screen uses them.

## What is here

| Path | What it is |
|---|---|
| `docs/colour-roles.md` | Brand colour, pinning of Primary 40, 14-tone palette, roles, functional colours, light and dark contrast ratios |
| `docs/type-scale.md`, `docs/divergences.md` | 15 DM Sans type styles (line height 1.5 for all) and the two divergences from Material |
| `docs/shadows.md` | Three shadows tinted with the brand blue |
| `docs/token-export-notes.md` | What the first Figma export was missing, and how the complete export is split into three files |
| `docs/prompts.md` | The prompt used for the token script and what changed from it |
| `docs/raw-value-search.md`, `docs/screen-comparison.md` | Proof the screen uses tokens, and the screen with and without the system |
| `docs/broken-referencing.md` | The deliberate regression and why token referencing matters |
| `docs/defects.md` | Real defects with file and line, three fixed and four open |
| `docs/interview-answers.md` | 12 interview answers |
| `evidence/` | Screenshots, exports, search output and git log (numbered 01 to 12) |
| `screen/` | The home screen, built only from tokens |
| `screen-without-system/` | A contrast example with hardcoded values. Never linked from the app |
| `../scripts/tokens-to-css.js`, `../tokens/dark-roles.json`, `../src/styles/tokens.css` | The generator, the dark-mode mapping and the generated CSS |

## How to run it

From the repo root:

```
npm run tokens
```

This reads the three `06-tokens-complete-*.json` files and `tokens/dark-roles.json`, and writes `src/styles/tokens.css`. If a role is a raw value, points at a missing primitive, or has no dark mapping, the script prints the problems, exits non-zero and writes nothing.

To see the screen, open `screen/index.html` in a browser. It needs no server. The font loads from Google Fonts, so without a connection it falls back to `system-ui`.

## Status

**Done and checked**
- Colour palette (14 tones), roles, functional colours and contrast ratios, in light and dark.
- 15 typography styles and 3 shadows, exported and turned into CSS variables. `npm run tokens` ran successfully: 57 roles, 15 type styles, 3 shadows.
- The home screen uses tokens only. The raw-value search found colour values only in `src/styles/tokens.css` and in one comment in the generator script.
- The deliberate regression was run on a throwaway branch and never merged. Evidence is in `evidence/11` and `evidence/12`.
- Defects 1, 2 and 5 in `docs/defects.md` are fixed.

**Not done, or done only in part**
- Spacing and radius are not tokens. `screen/screen.css` declares them as page-local values (defect 3).
- The button hover uses the `on-primary-container` role as a background (defect 4).
- The font is loaded from a CDN, and the hero heading does not scale with screen size (defects 6 and 7). Both are planned for Task 2.
- Dark mode is defined in the CSS and was looked at in a browser, but there is no dark-mode screenshot in `evidence/`.
- The optional 4-minute walkthrough (`evidence/13-walkthrough.mp4`) has not been recorded.
- `evidence/` also holds four unnumbered working images (`Colour Roles.png`, `Colour Roles2.png`, `Healthcare Brand Origin Board.png`, `typography.png`) that are not referenced by the numbered list.

**Not started**
- Tasks 2 to 5. Their folders contain only an empty README and empty `docs/` and `evidence/` folders. Nothing from the app, database, forms or authentication exists yet.

## Honest notes

- The Figma file is on the free plan, so there is one mode per collection and no dark mode in Figma. The dark mapping lives in `tokens/dark-roles.json`.
- Claude Code (an AI agent) wrote the token script, built the screen, and made the edits for the regression branch, at my instruction and with my review. The prompts and the agent's own answer about the hero heading are in `docs/prompts.md` and `evidence/08-agent-typography-answer.txt`.
- The brand colour was proposed for a fictional clinic. It does not come from a real brand.
