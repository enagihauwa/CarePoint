import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendmail";
import { verificationEmail } from "@/lib/email/verificationEmail";
import type { VerificationJob } from "@/lib/queue";
import { CODE_TTL_MINUTES, expiryFromNow, generateCode, hashCode } from "@/lib/verification";

export type Mailer = typeof sendEmail;

// The job: make a code, store its keyed hash, and email the code. Runs in the worker, never in a web request.
// Order matters: the hash is stored BEFORE the email is sent. The other way round, a patient could be sent a
// code that was never saved, so it could never verify. If the send fails the job is retried, and each try
// makes a fresh code and kills the older ones, so only the newest code ever works.
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

  if (user.emailVerifiedAt) return { sent: false, reason: "already verified" } as const;

  const code = generateCode();
  await prisma.$transaction([
    // Only the newest code may work: retire every older unused one for this user.
    prisma.emailVerification.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.emailVerification.create({ data: { userId: user.id, codeHash: hashCode(user.id, code), expiresAt: expiryFromNow() } }),
  ]);

  const { subject, text, html } = verificationEmail({ name: user.name, code, expiresInMinutes: CODE_TTL_MINUTES });
  await mail({ to: user.email, subject, text, html });
  return { sent: true, reason: "code sent" } as const;
}
