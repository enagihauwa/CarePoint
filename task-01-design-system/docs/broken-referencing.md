# Deliberate regression: broken token referencing

Evidence: `evidence/11-broken-referencing.png` (button on hover, purple next to the blue logo), `evidence/12-git-log-branch-unmerged.txt` (the experiment commit `fba2982` on a branch that was never merged).

## What was done

On a throwaway branch, `break-token-referencing`, I made two edits to `src/styles/tokens.css`:

- Changed the brand palette: `--palette-primary-30` from `#162AAA` to `#4A1B7A` and `--palette-primary-40` from `#1D38E2` to `#7B2CBF` (purple).
- Replaced the reference in one role with a raw hex: `--color-primary: #1D38E2` instead of `var(--palette-primary-40)`.

## What happened

Every role that still referenced the palette followed the change. The button hover state turned dark purple. The roles with a raw hex ignored it, so the logo stayed the old blue. The page now showed two brand colours at once.

The effect is only visible in some states (the button hover) because few elements on this screen use the primary tones. On a larger screen the drift would be much easier to see.

## Cleanup

The branch was never merged. `main` was restored and `tokens.css` on `main` still uses `var(--palette-primary-40)`. The branch was deleted with `git branch -D break-token-referencing` after the log was saved.

## Why token referencing matters

Components that point at roles (which point at primitives) pick up a palette change automatically, so a brand update is one edit instead of a hunt through every stylesheet.

A raw hex in a role or component breaks that chain silently: the page still looks fine until the palette changes, then that one element keeps the old colour and the theme drifts out of sync.

Referencing also keeps contrast decisions in one place — dark mode and on-colour pairings stay correct because they resolve through the same tokens rather than being re-guessed per component.
