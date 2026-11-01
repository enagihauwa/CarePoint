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

TODO: error `#B3261E` (confirm the hex in Figma), warning `#B85C38`, success `#15803D` (replacing `#11A76B`, which gave about 3.1:1 with white).

## Roles and contrast

TODO: after the variables are exported, compute the ratio for every text and background pair and list them here (role, what it is used for, ratio). Threshold: 4.5:1 for normal text, 3:1 for large text and UI components.
