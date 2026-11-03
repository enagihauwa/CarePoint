import { EMAIL_TOKENS as T } from "./emailTokens.generated";

// Every style is inline and uses a real value, never var(): many email apps ignore var() and
// external stylesheets. The values come from the Task 1 tokens (scripts/email-tokens.js).
const FONT = `'DM Sans', Arial, Helvetica, sans-serif`; // DM Sans only shows if the reader has it installed; Arial is the fallback.
const c = T.colour;
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

export function verificationEmail(input: { name: string; code: string; expiresInMinutes: number }) {
  const name = escapeHtml(input.name);
  const code = escapeHtml(input.code);
  const mins = Number(input.expiresInMinutes);
  const subject = "Your CarePoint Clinic verification code";
  const text = `Hello ${input.name},\n\nYour CarePoint Clinic verification code is ${input.code}.\nIt expires in ${mins} minutes. If you did not create an account, ignore this email.\n`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:${c.surface};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${c.surface};"><tr><td align="center" style="padding:${T.spacePx[4]}px ${T.spacePx[2]}px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:${c["surface-container-lowest"]};border:1px solid ${c["outline-variant"]};border-radius:${T.radiusPx}px;">
<tr><td style="padding:${T.spacePx[3]}px ${T.spacePx[3]}px ${T.spacePx[1]}px;font-family:${FONT};font-size:${T.type.label.sizePx}px;line-height:${T.type.label.linePx}px;font-weight:${T.type.label.weight};color:${c.primary};">CarePoint Clinic</td></tr>
<tr><td style="padding:0 ${T.spacePx[3]}px;font-family:${FONT};font-size:${T.type.headline.sizePx}px;line-height:${T.type.headline.linePx}px;font-weight:${T.type.headline.weight};color:${c["on-surface"]};">Verify your email</td></tr>
<tr><td style="padding:${T.spacePx[2]}px ${T.spacePx[3]}px 0;font-family:${FONT};font-size:${T.type.body.sizePx}px;line-height:${T.type.body.linePx}px;font-weight:${T.type.body.weight};color:${c["on-surface-variant"]};">Hello ${name}, enter this code on the CarePoint sign-up page to confirm your email address.</td></tr>
<tr><td align="center" style="padding:${T.spacePx[3]}px;"><div style="display:inline-block;padding:${T.spacePx[2]}px ${T.spacePx[3]}px;background-color:${c["primary-container"]};color:${c["on-primary-container"]};border-radius:${T.radiusPx}px;font-family:${FONT};font-size:${T.type.headline.sizePx}px;line-height:${T.type.headline.linePx}px;font-weight:${T.type.headline.weight};letter-spacing:8px;">${code}</div></td></tr>
<tr><td style="padding:0 ${T.spacePx[3]}px ${T.spacePx[3]}px;font-family:${FONT};font-size:${T.type.small.sizePx}px;line-height:${T.type.small.linePx}px;font-weight:${T.type.small.weight};color:${c["on-surface-variant"]};">This code expires in ${mins} minutes. If you did not create a CarePoint account, you can ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}
