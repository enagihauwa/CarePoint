import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendmail";
import { resetEmail, verificationEmail } from "@/lib/email/verificationEmail";
import type { VerificationJob } from "@/lib/queue";
import { CODE_TTL_MINUTES, expiryFromNow, generateCode, hashCode } from "@/lib/verification";

export type Mailer = typeof sendEmail;

// The job: make a code, store its keyed hash, and email the code. Runs in the worker, never in a web request.
// Order matters: the hash is stored BEFORE the email is sent. The other way round, a patient could be sent a
// code that was never saved, so it could never work. If the send fails the job is retried, and each try
// makes a fresh code and kills the older ones OF THE SAME PURPOSE, so only the newest code ever works.
// "Same purpose" matters: asking for a new verification code must not cancel a reset code the person is
// in the middle of using, and the other way round.
export async function sendVerificationEmail(job: VerificationJob, mail: Mailer = sendEmail) {
  const user = await prisma.user.findUnique({ where: { id: job.userId } });
  if (!user) return { sent: false, reason: "no such user" } as const;

  if (job.kind === "already_registered") {
    // Someone tried to register this address again. Tell the owner, with NO code in it.
    await mail({
      to: user.email,
      subject: "Someone tried to register your email at CarePoint Clinic",
      text: `Hello ${user.name},\n\nSomeone tried to create a CarePoint Clinic account with this email address, but you already have one. If that was you, you can log in instead. If it was not you, you can ignore this email.\n`,
    });
    return { sent: true, reason: "already registered notice" } as const;
  }

  if (job.kind === "reset") {
    // The placeholder account that owns the bookings made before accounts existed is not a person and has
    // no real mailbox (its address ends in .invalid). Never mail it.
    if (user.email.endsWith(".invalid")) return { sent: false, reason: "not a real mailbox" } as const;

    const code = generateCode();
    await prisma.$transaction([
      prisma.emailVerification.updateMany({ where: { userId: user.id, purpose: "reset", usedAt: null }, data: { usedAt: new Date() } }),
      prisma.emailVerification.create({ data: { userId: user.id, purpose: "reset", codeHash: hashCode(user.id, code), expiresAt: expiryFromNow() } }),
    ]);
    const { subject, text, html } = resetEmail({ name: user.name, code, expiresInMinutes: CODE_TTL_MINUTES });
    await mail({ to: user.email, subject, text, html });
    return { sent: true, reason: "reset code sent" } as const;
  }

  if (user.emailVerifiedAt) return { sent: false, reason: "already verified" } as const;

  const code = generateCode();
  await prisma.$transaction([
    // Only the newest code may work: retire every older unused one of this kind for this user.
    prisma.emailVerification.updateMany({ where: { userId: user.id, purpose: "verify", usedAt: null }, data: { usedAt: new Date() } }),
    prisma.emailVerification.create({ data: { userId: user.id, purpose: "verify", codeHash: hashCode(user.id, code), expiresAt: expiryFromNow() } }),
  ]);

  const { subject, text, html } = verificationEmail({ name: user.name, code, expiresInMinutes: CODE_TTL_MINUTES });
  await mail({ to: user.email, subject, text, html });
  return { sent: true, reason: "code sent" } as const;
}
