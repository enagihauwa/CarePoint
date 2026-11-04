import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

// The numbers from task-04-server-security/docs/verification-design.md (my decisions).
export const CODE_LENGTH = 6;
export const CODE_TTL_MINUTES = 10;
export const MAX_WRONG_TRIES = 5;

// A 6-digit code from the operating system's secure random source. Math.random is NOT used: it is not
// built to be unpredictable. padStart keeps the leading zeros, so 48213 is written 048213.
export function generateCode(): string {
  return randomInt(0, 10 ** CODE_LENGTH).toString().padStart(CODE_LENGTH, "0");
}

function secretKey(): string {
  const key = process.env.VERIFICATION_SECRET;
  // Refuse to hash with no key or a short one: a plain hash of a 6-digit code can be reversed in under a second.
  if (!key || key.length < 32) throw new Error("VERIFICATION_SECRET must be set in .env and be at least 32 characters.");
  return key;
}

// HMAC-SHA-256 keyed with a secret that lives only in .env, and tied to the user, so the same code
// gives two users two different hashes. Someone with a copy of the database but not the key cannot
// try the 1,000,000 codes against it.
export function hashCode(userId: number, code: string): string {
  return createHmac("sha256", secretKey()).update(`${userId}:${code}`).digest("hex");
}

// Constant-time comparison, so the time taken does not reveal how many characters matched.
export function codeMatches(userId: number, submitted: string, storedHash: string): boolean {
  if (!/^\d{6}$/.test(submitted)) return false;
  const a = Buffer.from(hashCode(userId, submitted), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function expiryFromNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + CODE_TTL_MINUTES * 60_000);
}
