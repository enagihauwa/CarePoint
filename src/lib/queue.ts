import { PgBoss } from "pg-boss";

// The background queue lives in my existing PostgreSQL (no Redis). pg-boss creates its own schema,
// "pgboss", and its own tables there the first time it starts. They are NOT in my Prisma migrations
// (task-04-server-security/docs/schema.md).
export const VERIFICATION_QUEUE = "send-verification-email";

// Only a user id and a kind go in the job. The code itself is made inside the worker, so the plaintext
// never sits in the queue's tables.
export type VerificationJob = { userId: number; kind: "verify" | "already_registered" };

// 3 retries with a growing delay (30 s, then about 1 min, then about 2 min), then the job is marked failed.
// A finished job is deleted after an hour, and a job that waits unclaimed for 15 minutes is dropped,
// because a verification code is useless after 10 minutes anyway.
export const QUEUE_OPTIONS = {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
  expireInSeconds: 120,
  retentionSeconds: 15 * 60,
  deleteAfterSeconds: 60 * 60,
} as const;

const shared = globalThis as unknown as { __carepointBoss?: Promise<PgBoss> };

// One started boss per process, shared the way the Prisma client is.
export function getBoss(): Promise<PgBoss> {
  shared.__carepointBoss ??= (async () => {
    const boss = new PgBoss(process.env.DATABASE_URL as string);
    boss.on("error", (error) => console.error("Queue error:", error instanceof Error ? error.message : error));
    await boss.start();
    await boss.createQueue(VERIFICATION_QUEUE, QUEUE_OPTIONS);
    return boss;
  })();
  return shared.__carepointBoss;
}

export async function enqueueVerification(job: VerificationJob) {
  const boss = await getBoss();
  return boss.send(VERIFICATION_QUEUE, job);
}
