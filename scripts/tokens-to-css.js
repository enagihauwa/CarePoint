// Converts the Figma token exports into src/styles/tokens.css.
// Exits non-zero (and writes nothing) if a role is missing, raw, or points at a missing primitive.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const evidence = path.join(root, "task-01-design-system", "evidence");
const PRIMITIVES = path.join(evidence, "06-tokens-complete-primitives.json");
const ROLES = path.join(evidence, "06-tokens-complete-roles.json");
const TYPE_SHADOWS = path.join(evidence, "06-tokens-complete-typography-shadows.json");
const DARK = path.join(root, "tokens", "dark-roles.json");
const OUT = path.join(root, "src", "styles", "tokens.css");

const errors = [];
const fail = (msg) => errors.push(msg);
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
const slug = (s) => s.trim().toLowerCase().replace(/\s+/g, "-");
const entries = (o) => Object.entries(o).filter(([k]) => !k.startsWith("$") && !k.startsWith("_"));
const rem = (px) => `${+(px / 16).toFixed(4)}rem`;

// "Neutral Variant 30" -> { palette: "Neutral Variant", tone: "30" }
function parseTone(label) {
  const m = /^(.+?)\s+(\d+)$/.exec(label.trim());
  return m ? { palette: m[1], tone: m[2] } : null;
}
const paletteVar = (palette, tone) => `--palette-${slug(palette)}-${tone}`;

// ---- primitives (private) ----
const primitives = read(PRIMITIVES);
const paletteHex = {}; // "--palette-primary-40" -> "#1D38E2"
const primitiveLines = [];
for (const [name, tok] of entries(primitives["Key Colours"])) {
  const v = `--palette-key-${slug(name.replace(/ Key Colours?$/i, ""))}`;
  primitiveLines.push(`  ${v}: ${tok.$value.hex};`);
}
for (const [palette, tokens] of entries(primitives["Colour Palettes"])) {
  for (const [name, tok] of entries(tokens)) {
    const parsed = parseTone(name);
    if (!parsed) { fail(`primitive "${palette}/${name}" has no tone number`); continue; }
    if (name.includes("  ")) fail(`primitive "${name}" contains a double space`);
    const v = paletteVar(palette, parsed.tone);
    paletteHex[v] = tok.$value.hex.toUpperCase();
    primitiveLines.push(`  ${v}: ${tok.$value.hex};`);
  }
}

// ---- light roles (must be aliases, never raw hex) ----
const roles = read(ROLES);
const roleNames = entries(roles).map(([k]) => k);
const lightLines = [];
for (const [name, tok] of entries(roles)) {
  const alias = tok.$extensions && tok.$extensions["com.figma.aliasData"];
  const target = alias && alias.targetVariableName;
  if (!target) { fail(`role "${name}" has no alias to a primitive (raw value)`); continue; }
  const parsed = parseTone(target.split("/").pop());
  if (!parsed) { fail(`role "${name}" alias "${target}" has no tone number`); continue; }
  const pv = paletteVar(parsed.palette, parsed.tone);
  if (!(pv in paletteHex)) { fail(`role "${name}" points at missing primitive ${pv}`); continue; }
  if (paletteHex[pv] !== tok.$value.hex.toUpperCase()) {
    fail(`role "${name}" hex ${tok.$value.hex} does not match ${pv} (${paletteHex[pv]})`);
  }
  lightLines.push(`  --color-${slug(name)}: var(${pv});`);
}

// ---- dark roles (same names, different tones) ----
const dark = read(DARK);
const darkLines = [];
for (const name of roleNames) {
  const label = dark[name];
  if (!label) { fail(`dark mapping is missing role "${name}"`); continue; }
  const parsed = parseTone(label);
  const pv = parsed && paletteVar(parsed.palette, parsed.tone);
  if (!pv || !(pv in paletteHex)) { fail(`dark role "${name}" points at missing primitive "${label}"`); continue; }
  darkLines.push(`  --color-${slug(name)}: var(${pv});`);
}
for (const [name] of entries(dark)) {
  if (!roleNames.includes(name)) fail(`dark mapping has unknown role "${name}"`);
}

// ---- typography and shadows ----
const ts = read(TYPE_SHADOWS);
const resolve = (ref, group) => {
  const key = String(ref).replace(/[{}]/g, "").split(".").pop();
  const tok = ts[group] && ts[group][key];
  if (!tok) { fail(`unresolved reference ${ref} in ${group}`); return null; }
  return tok.$value;
};
const WEIGHTS = { regular: 400, medium: 500, semibold: 600, bold: 700 };
const STYLES = [];
for (const role of ["Display", "Headline", "Title", "Body", "Label"]) {
  for (const size of ["Large", "Medium", "Small"]) STYLES.push(`${role} ${size}`);
}
const typeLines = [];
const classLines = [];
for (const name of STYLES) {
  const tok = ts[name];
  if (!tok || tok.$type !== "typography") { fail(`typography style "${name}" is missing`); continue; }
  const v = tok.$value;
  const family = resolve(v.fontFamily, "fontFamilies");
  const weight = resolve(v.fontWeight, "fontWeights");
  const size = resolve(v.fontSize, "fontSize");
  const lh = resolve(v.lineHeight, "lineHeights");
  const ls = resolve(v.letterSpacing, "letterSpacing");
  if ([family, weight, size, lh, ls].includes(null)) continue;
  const w = WEIGHTS[String(weight).toLowerCase().replace(/\s+/g, "")];
  const lsMatch = /^(-?[\d.]+)%$/.exec(String(ls));
  if (!w) { fail(`"${name}" has unknown weight ${weight}`); continue; }
  if (!lsMatch) { fail(`"${name}" letter spacing "${ls}" is not a percentage`); continue; }
  const p = `--type-${slug(name)}`;
  typeLines.push(
    `  ${p}-family: "${family}", system-ui, sans-serif;`,
    `  ${p}-weight: ${w};`,
    `  ${p}-size: ${rem(size)};`,
    `  ${p}-letter-spacing: ${+(lsMatch[1] / 100).toFixed(4)}em;`,
    `  ${p}-line-height: ${rem(lh)};`
  );
  classLines.push(
    `.type-${slug(name)} {`,
    `  font-family: var(${p}-family);`,
    `  font-weight: var(${p}-weight);`,
    `  font-size: var(${p}-size);`,
    `  letter-spacing: var(${p}-letter-spacing);`,
    `  line-height: var(${p}-line-height);`,
    `}`
  );
}
const shadowLines = [];
for (const name of ["Soft Shadow", "Medium Shadow", "Hard Shadow"]) {
  const tok = ts[name];
  if (!tok || tok.$type !== "boxShadow") { fail(`shadow "${name}" is missing`); continue; }
  const s = tok.$value;
  shadowLines.push(`  --shadow-${slug(name).replace("-shadow", "")}: ${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color};`);
}

if (errors.length) {
  console.error(`tokens: ${errors.length} problem(s), nothing written:`);
  errors.forEach((e) => console.error("  - " + e));
  process.exit(1);
}

const darkBlock = darkLines.join("\n");
const css = `/* Generated by scripts/tokens-to-css.js. Do not edit by hand. */

/* Primitive palette: PRIVATE. Components must never reference --palette-* */
:root {
${primitiveLines.join("\n")}
}

/* Colour roles (light): the only colours components may use */
:root {
${lightLines.join("\n")}
}

/* Dark mode: same role names, different tones */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${darkBlock.replace(/^/gm, "  ")}
  }
}
:root[data-theme="dark"] {
${darkBlock}
}

/* Typography */
:root {
${typeLines.join("\n")}
}

/* Shadows */
:root {
${shadowLines.join("\n")}
}

/* Typography utility classes */
${classLines.join("\n")}
`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, css);
console.log(`tokens: wrote ${path.relative(root, OUT)} (${roleNames.length} roles, ${STYLES.length} type styles, ${shadowLines.length} shadows)`);
