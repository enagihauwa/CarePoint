
// No "server-only" import: this file is also run outside Next.js (the test script and, later, the worker).
// Host, port and credentials come only from .env (names in .env.example, never the values).
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    requireTLS: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

export async function sendEmail({
    to,
    subject,
    text,
}: {
    to: string;
    subject: string;
    text: string;
}) {
    return transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        text,
    });
}
export async function verifyEmailConnection() {
    return transporter.verify();
}