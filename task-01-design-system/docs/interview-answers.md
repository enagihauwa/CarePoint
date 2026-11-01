# CarePoint Clinic – Interview Answers

### 1. Why did you replace your first brand colour, `#2DDDBD`, with `#1D38E2`?

I changed my original teal colour, `#2DDDBD`, mainly because it did not provide enough contrast with white text. The contrast ratio was approximately 1.7:1, which is below the WCAG AA requirement of 4.5:1 for normal text. My new blue, `#1D38E2`, provides approximately 7.7:1 contrast with white, making it more suitable for buttons and other important elements. I also preferred the blue because it gives CarePoint a professional and trustworthy appearance.

### 2. What does pinning Primary 40 do, and why that tone?

Pinning Primary 40 makes my chosen brand colour the reference for tone 40 when generating the primary tonal palette. I selected this tone because it is used by the Primary role in light mode, where white text needs sufficient contrast. Before pinning, Primary 40 was a greyish blue, `#535A92`. After pinning, it became my chosen brand blue, `#1D38E2`. The neighbouring tones also adjusted, with Primary 30 becoming `#162AAA` and Primary 50 becoming `#4359E7`. This helped align the generated palette with my brand colour.

### 3. What is the difference between a primitive and a role, and why must components only use roles?

A primitive is a basic design value, while a role gives that value a specific purpose in the interface. In my project, primitives are defined using private `--palette-*` variables, while roles such as `--color-primary` reference those primitives. For example, `--color-primary` points to `--palette-primary-40` in light mode and can be remapped to `--palette-primary-80` in dark mode. Components should use roles rather than hard-coded colour values so that colour changes can be managed centrally and consistently. This also makes it easier to support different themes.

### 4. Why can one source colour serve both light and dark mode?

One source colour can serve both light and dark mode because it generates different tonal variations that can be used for different backgrounds and text combinations. In my CarePoint system, the Primary role uses Primary 40 in light mode and Primary 80 in dark mode. Similarly, the surface uses Neutral 98 in light mode and Neutral 10 in dark mode. The colour hue remains consistent, but the tones change to provide suitable contrast and readability. My system uses 14 tones per colour to provide enough variations for both themes while maintaining the same brand identity.

### 5. How did you decide the line height for each type role, and why are some multipliers different?

No role differs. I used a 1.5 line-height multiplier across all five typography roles to give text enough breathing space and make it easier to read, especially on smaller screens. For example, Display Large uses a 64px font size with a 96px line height, while my hero heading uses Display Small at 40px with a 60px line height. I recognise that 1.5 can feel loose for large display text, so I would consider testing a lower multiplier, such as 1.2 or 1.3, for display styles. However, I kept 1.5 to maintain consistency and comfortable readability across the system.

### 6. Name one divergence from the Material defaults and a situation where your choice would be wrong.

I chose DM Sans instead of Roboto, the default Material typeface, across all 15 typography styles. I also used heavier heading weights, with Semibold for Display and Medium for Headline, instead of Regular. I made these choices to give CarePoint a friendly, modern and clear appearance while helping important headings stand out. However, DM Sans may not be suitable for a product that requires a more traditional or formal visual style. The heavier headings may also feel too bold in a very minimal interface or on large screens.

### 7. Why are your shadows tinted with the brand colour instead of black, and what are the values of your medium shadow?

I used the primary brand blue, `#1D38E2`, for my shadows instead of black because I wanted them to blend naturally with the CarePoint colour system and create a softer, more consistent appearance. The blue tint helps cards feel like part of the brand palette rather than having a dirty grey appearance. My medium shadow uses an X offset of 4px, Y offset of 6px, blur of 24px and spread of 0px, with `#1D38E2` at 18% opacity.

### 8. What was missing from your first Figma export, and how did you notice?

The first export, `05-tokens-incomplete.json`, did not fully reflect my CarePoint design system. When I compared it with my Figma variables and styles, I noticed that the generated Primary 40 colour was `#2F47ED` instead of my pinned brand colour, `#1D38E2`. It also contained 18 tones per palette, while my own design system used 14 tones. Although the export included Material's tonal palettes and light and dark colour schemes, it did not include my Figma variables (my named primitives and roles and the references between them), my success and warning colours, my typography styles or my shadows. I later exported the Figma variables into separate files and included my typography styles and shadows in `06-tokens-complete-typography-shadows.json`.

### 9. Why did you build the dark mapping in `tokens/dark-roles.json` instead of in Figma?

My Figma plan allows only one mode per variable collection, so I could not create a separate dark mode within Figma. I therefore created `tokens/dark-roles.json` to define how the same colour roles should map to different palette tones in dark mode. This allows the roles to keep the same names while using different tones when the theme changes.

### 10. What does `scripts/tokens-to-css.js` check for, and what happens when a check fails?

The script checks that my design tokens are properly connected before generating the CSS file. It checks that colour roles reference valid primitives instead of using raw hex values, that the referenced primitives exist, and that the light and dark role mappings are complete and valid. It also checks that all 15 typography styles and the three shadows are present, and that typography references, font weights and letter-spacing values are valid.

If any check fails, the script lists the problems, exits with a non-zero status and does not write or update `tokens.css`. This helps prevent incomplete or incorrectly connected design tokens from being generated. My recorded run of `npm run tokens` completed successfully and generated 57 roles, 15 typography styles and three shadows.

### 11. Your raw-value search found hits only in `tokens.css`. What does that tell you, and what doesn't it tell you?

It tells me that the screen's colours are coming from the generated design tokens rather than being hard-coded directly in the screen files. The raw colour values are defined in `tokens.css`, where the palette and key colours are stored.

However, the search only checked for raw colour values. It does not prove that other design properties, such as spacing and border radius, are tokenised. In fact, I identified a separate defect where spacing and radius values were hard-coded in `screen.css` instead of being connected to design tokens. This means I still need to include spacing and radius in the token system.

### 12. Walk me through your deliberate regression: what you changed, what you saw, and what it proves.

I created a temporary branch called `break-token-referencing` and deliberately changed two primary palette values in `tokens.css`. I changed Primary 30 to purple (`#4A1B7A`) and Primary 40 to `#7B2CBF`. I also changed the `--color-primary` role from referencing `var(--palette-primary-40)` to using the raw hex `#1D38E2`.

When I viewed the page, the button hover state turned dark purple because it was still connected to the palette. However, the logo remained blue because its role used a raw hex value and did not follow the palette change. This showed two brand colours on the same page.

The experiment proved that components connected through roles and primitives update automatically when the palette changes, while raw values break that connection and can cause inconsistent colours. I kept the experiment on a temporary branch, which I never merged, and restored `main` to its original state.
