# Prompts

## Step 6: JSON to CSS variables

### Prompt as used

```
Read docs/ and the file evidence/06-tokens-complete.json before doing anything. Summarise how the JSON is structured (primitives vs roles vs typography vs effects) and wait for my approval.

Then write a Node script scripts/tokens-to-css.js that converts the JSON into src/styles/tokens.css with CSS custom properties.

Hard requirements:
1. Primitive palette values (e.g. primary-40) are defined as variables but are PRIVATE: components must never reference them.
2. Colour ROLES (surface, on-surface, primary, on-primary, etc.) are defined as variables that reference the primitives with var(--palette-...), never as raw hex. Components may only use roles.
3. Emit typography as variables for family, weight, size, letter-spacing, line-height for all 15 styles, plus utility classes per style.
4. Emit the 3 shadows as variables.
5. Add a dark-mode block using the same role names pointing at different tones.
6. Fail loudly (non-zero exit) if any role has a raw hex value or a missing reference.
7. Add an npm script "tokens" to run it.
8. List every file you created and every assumption you made, then audit your output against these 7 requirements.
```

### What I changed from the prompt, and why

- The export is three files, not one `06-tokens-complete.json`, because Figma's built-in variable export does not include text or effect styles. The script reads `06-tokens-complete-primitives.json`, `06-tokens-complete-roles.json` and `06-tokens-complete-typography-shadows.json`.
- The typography file contains a leftover `material-theme` group (Roboto) from the Material Theme Builder plugin. I told the agent to ignore it and read only my 15 styles and 3 shadows.
- My Figma plan allows one mode per variable collection, so there is no dark mode in Figma. The dark mapping lives in `tokens/dark-roles.json`.
- No `package.json` existed yet (Task 2 scaffolds the app), so a minimal one was created for the `tokens` script.

### Attempts

TODO (mine): record anything that failed or that I changed after running `npm run tokens`, in order, with what I changed in the prompt.
