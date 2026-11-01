# Raw colour value search

Evidence: `evidence/07-raw-value-search.txt`. The first line of that file records that Claude Code ran the command on my machine on 2026-11-01. I should re-run it myself before the viva.

## Result

I ran a search for raw colour values across the project. The results showed that the matches appear only in `src/styles/tokens.css`, which is the generated file where the design tokens and colour values are defined, and in one comment in `scripts/tokens-to-css.js` that uses `#1D38E2` as an example.

There were no raw colour values in `task-01-design-system/screen/index.html` or `screen.css`. This shows that the screen uses the generated design tokens instead of hard-coded colour values, helping to keep the interface consistent and making future colour updates easier to manage.
