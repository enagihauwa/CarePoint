// Test helper: store a known code for an email, using the same functions the worker uses.
try { process.loadEnvFile(); } catch {}
import { prisma } from "../../src/lib/db";
import { expiryFromNow, hashCode } from "../../src/lib/verification";
(async () => {
  const [email, code] = process.argv.slice(2);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.emailVerification.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.emailVerification.create({ data: { userId: user.id, codeHash: hashCode(user.id, code), expiresAt: expiryFromNow() } });
  await prisma.$disconnect();
})();
