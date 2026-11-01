# Colour system: CarePoint Clinic

Status: in progress. Sections marked TODO are not finished.

## Brand colour and where it came from

The brand colour is `#1D38E2`. CarePoint is a fictional clinic, so it was not taken from a real logo, signage or existing brand. It is a proposed direction.

My first choice was `#2DDDBD` (a light teal). White text on it gives about 1.7:1 contrast, far below the 4.5:1 WCAG AA minimum for normal text, so it could not carry white button labels. I replaced it with `#1D38E2`, which gives about 7.7:1 with white.

## Pinning the brand colour

Before pinning, the generated Primary tonal palette appeared more muted and slightly greyish compared with my intended CarePoint brand blue, #1D38E2. After pinning the brand colour at Primary 40, the updated palette retained my exact chosen blue at the required position, with darker and lighter tonal variations arranged around it. This made the palette more consistent with CarePoint's intended visual identity and ensured that the primary colour used throughout the design system reflects the brand I wanted to establish. I chose Primary 40 because it was a specific requirement of the assignment and provides a fixed reference point for generating and applying the other primary shades.

Evidence: `evidence/01-palette-before-pin.png` (generated tone 40 is `#535A92`), `evidence/02-palette-after-pin.png` (tone 40 is `#1D38E2`).

TODO: replace the last sentence with my own reason (contrast with white), and say what happened to the neighbouring tones.

## Tones

The palette uses 14 tones per colour: 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99 and 100. This is Material's standard 13 tones plus tone 98. I did not drop any tones from this set; it is the tone set I was taught. Material Theme Builder's web tool shows 18 tones (it also lists 5, 15, 25 and 35), but I did not use those.

One source colour is enough for both light and dark themes because each theme only reads different tones of the same palette. Light mode puts the strong colours at the low-to-middle tones (for example Primary at 40, on-colours at 100) and surfaces at the high tones (90 to 98). Dark mode flips that: Primary moves to a lighter tone such as 80, and surfaces use dark tones such as 10 and 20. The hue stays the same and only the lightness changes, so no second palette is needed.

Tone 98 is there because the Surface role uses Neutral 98, a near-white that is slightly softer than pure white.

## Surface levels

Material defines five surface container roles, but with my 14-tone set only three light-mode levels are visibly different: Neutral 100 (white), Neutral 95 and Neutral 90. Tone 98 is already used by the base Surface role, and tone 80 is too dark to use as a background behind body text. So the roles share tones: Surface Container Lowest uses Neutral 100, Surface Container Low and Surface Container both use Neutral 95, and Surface Container High and Surface Container Highest both use Neutral 90. This is a known limit of the tone set, not a mistake. The CarePoint screens (booking, price list, admin table) only need about three levels: white cards, a soft panel and a stronger panel. Dark mode has more room, because the dark tones (10, 20, 30) are spaced further apart.

## Functional colours

| Colour | Key colour I typed in | Role colour actually used (tone 40) | White text on it |
|---|---|---|---|
| Error | `#B3261E` | `#AB2821` (Error 40) | 6.87:1 |
| Warning | `#B85C38` | `#9E4D2E` (Warning 40) | 5.91:1 |
| Success | `#11A76B` | `#167A52` (Success 40) | 5.33:1 |

The key colours are only the seeds the tonal palettes are built from. The roles point at tone 40, which is darker, so white text passes 4.5:1 on all three. I did not change the success key colour to a darker green as I first planned, because the generated Success 40 already passes. The raw key colours (for example `#11A76B`, which gives about 3.1:1 with white) must never be used in the UI. Components use roles only.

Success and error are both green and red hues, which people with red-green colour blindness can confuse, so neither is ever shown by colour alone. Each comes with an icon and text.

## Contrast check (light mode)

Every foreground/background pair the UI will use, calculated from the hex values in `evidence/06-tokens-complete-roles.json` with the WCAG relative-luminance formula. Thresholds: 4.5:1 for normal text, 3:1 for large text and UI components (WCAG AA).

| Foreground role | Background role | Use | Hex | Ratio | Result |
|---|---|---|---|---|---|
| On Primary | Primary | Text | `#FFFFFF` on `#1D38E2` | 7.73:1 | Pass |
| On Primary Container | Primary Container | Text | `#162AAA` on `#D9DEFA` | 8.11:1 | Pass |
| On Secondary | Secondary | Text | `#FFFFFF` on `#256D85` | 5.83:1 | Pass |
| On Secondary Container | Secondary Container | Text | `#1C5264` on `#DBE7EB` | 6.82:1 | Pass |
| On Tertiary | Tertiary | Text | `#FFFFFF` on `#08705F` | 6.01:1 | Pass |
| On Tertiary Container | Tertiary Container | Text | `#065447` on `#D6E7E4` | 6.93:1 | Pass |
| On Error | Error | Text | `#FFFFFF` on `#AB2821` | 6.87:1 | Pass |
| On Error Container | Error Container | Text | `#811E18` on `#F7D6D4` | 7.28:1 | Pass |
| On Success | Success | Text | `#FFFFFF` on `#167A52` | 5.33:1 | Pass |
| On Success Container | Success Container | Text | `#105C3E` on `#D8E9E2` | 6.36:1 | Pass |
| On Warning | Warning | Text | `#FFFFFF` on `#9E4D2E` | 5.91:1 | Pass |
| On Warning Container | Warning Container | Text | `#773A22` on `#F4DFD7` | 6.79:1 | Pass |
| On Surface | Surface | Text | `#181B1E` on `#F9FAFB` | 16.55:1 | Pass |
| On Surface Variant | Surface | Text | `#434B59` on `#F9FAFB` | 8.41:1 | Pass |
| On Surface Variant | Surface Variant | Text | `#434B59` on `#E3E5E8` | 6.96:1 | Pass |
| On Surface | Surface Container Lowest | Text | `#181B1E` on `#FFFFFF` | 17.29:1 | Pass |
| On Surface | Surface Container Low | Text | `#181B1E` on `#F2F3F4` | 15.57:1 | Pass |
| On Surface | Surface Container | Text | `#181B1E` on `#F2F3F4` | 15.57:1 | Pass |
| On Surface | Surface Container High | Text | `#181B1E` on `#E5E6E9` | 13.86:1 | Pass |
| On Surface | Surface Container Highest | Text | `#181B1E` on `#E5E6E9` | 13.86:1 | Pass |
| On Background | Background | Text | `#181B1E` on `#F9FAFB` | 16.55:1 | Pass |
| Inverse On Surface | Inverse Surface | Text | `#F2F3F4` on `#31363D` | 10.95:1 | Pass |
| Primary | Surface | Text | `#1D38E2` on `#F9FAFB` | 7.40:1 | Pass |
| Error | Surface | Text | `#AB2821` on `#F9FAFB` | 6.57:1 | Pass |
| Success | Surface | Text | `#167A52` on `#F9FAFB` | 5.10:1 | Pass |
| Warning | Surface | Text | `#9E4D2E` on `#F9FAFB` | 5.65:1 | Pass |
| Secondary | Surface | Text | `#256D85` on `#F9FAFB` | 5.57:1 | Pass |
| Tertiary | Surface | Text | `#08705F` on `#F9FAFB` | 5.75:1 | Pass |
| Outline | Surface | UI component / border | `#757E8E` on `#F9FAFB` | 3.92:1 | Pass |
| Outline | Surface Container Lowest | UI component / border | `#757E8E` on `#FFFFFF` | 4.09:1 | Pass |
| Outline Variant | Surface | UI component / border | `#E3E5E8` on `#F9FAFB` | 1.21:1 | Fail |
| Primary | Surface | UI component / border | `#1D38E2` on `#F9FAFB` | 7.40:1 | Pass |

### The one pair that fails

Outline Variant on Surface is 1.21:1, below the 3:1 needed for UI components. Outline Variant is used only for decorative dividers and subtle separators, never for the border of an input, a button or any control, and never for text. Controls use Outline (3.92:1 on Surface). If a screen ever needs a divider to be the only thing marking an area, it must use Outline instead.

### Notes

- Surface Container Low and Surface Container share a tone (Neutral 95), and so do Surface Container High and Highest (Neutral 90), so their rows show the same ratio.
- Dark-mode pairs are checked separately below.

## Contrast check (dark mode)

The dark mapping lives in `tokens/dark-roles.json` in the repo, not in Figma, because the free Figma plan allows one mode per variable collection. Each role points at a different tone of the same palette (for example Primary 40 in light, Primary 80 in dark). I checked 34 pairs with the same WCAG formula, using the hexes from `evidence/06-tokens-complete-primitives.json`.

- **33 of 34 pairs pass.** Every on-colour pair is 6.8:1 or higher on its colour or container, and On Surface on Surface is 13.86:1.
- The tightest passing pairs are On Surface Variant on Surface Container High and Highest (4.99:1) and On Surface Variant on Surface Variant (5.41:1).
- **Outline Variant on Surface fails at 1.97:1**, the same decorative-only pair that fails in light mode. It stays limited to dividers, never controls or text.
