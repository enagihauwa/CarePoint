// No "server-only" import: this file is also run outside Next.js (the test script and, later, the worker).
// Host, port and credentials come only from .env (names in .env.example, never the values).
import nodemailer from "nodemailer";

// Built on first use, not at import time, so .env is already loaded by then. Reading process.env
// when the module loads silently connected to localhost when the script loaded .env too late.
let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // port 587 starts plain, then upgrades with STARTTLS
    requireTLS: true, // refuse to send credentials unless the connection is encrypted
    family: 4, // IPv4 only: on this machine's network the IPv6 attempt to Gmail hangs for 30 s ("Greeting never received")
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  return transporter;
}

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
  return getTransporter().sendMail({ from: process.env.SMTP_FROM, to, subject, text, html });
}

export async function verifyEmailConnection() {
  return getTransporter().verify();
}
