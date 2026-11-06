import { prisma } from "@/lib/db";
import { DAY_MS, GRACE_DAYS } from "@/lib/deletionConfig";

// What the nightly job does: every patient whose deletion was requested at least GRACE_DAYS ago is ANONYMISED.
// The identity (name, email, phone, password hash) is replaced by placeholders and the login ends. The booking and
// payment records are KEPT: the clinic has to keep payment records, so they stay without a name or contact details
// (the conflict, and the legal period, are for retention-matrix.md, which is mine to write and check).
//
// The user row is anonymised, not deleted: payments point to bookings and bookings point to the patient.
// EVERYTHING happens in ONE transaction. If anything fails, nothing at all has changed, and the next night's run
// tries again. Running it twice does nothing the second time.
export type PurgeResult = { due: number; anonymised: number; sessionsDeleted: number; codesDeleted: number; bookingsKept: number; paymentsKept: number };

export async function purgeDeletedAccounts(now: Date = new Date(), log: (line: string) => void = console.log): Promise<PurgeResult> {
  const started = performance.now();
  const cutoff = new Date(now.getTime() - GRACE_DAYS * DAY_MS);
  log(`JOB START purge-deleted-accounts at=${now.toISOString()} grace_days=${GRACE_DAYS} cutoff=${cutoff.toISOString()}`);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Patients only: a staff account is never purged by this job.
      const due = await tx.user.findMany({
        where: { role: "patient", status: "pending_deletion", deletionRequestedAt: { lte: cutoff } },
        select: { id: true },
        orderBy: { id: "asc" },
      });
      const ids = due.map((user) => user.id);
      if (ids.length === 0) return { due: 0, anonymised: 0, sessionsDeleted: 0, codesDeleted: 0, bookingsKept: 0, paymentsKept: 0 };

      const sessions = await tx.session.deleteMany({ where: { userId: { in: ids } } });
      const codes = await tx.emailVerification.deleteMany({ where: { userId: { in: ids } } });
      await tx.patient.updateMany({ where: { userId: { in: ids } }, data: { phone: "" } });

      // One update per account, because each placeholder email must be different (email is unique).
      for (const id of ids) {
        await tx.user.update({
          where: { id },
          data: { email: `deleted-${id}@deleted.invalid`, name: "Deleted patient", passwordHash: "!", emailVerifiedAt: null, status: "deleted" },
        });
      }

      // Counted, to show what was kept (nothing is changed here).
      const bookingsKept = await tx.booking.count({ where: { patient: { userId: { in: ids } } } });
      const paymentsKept = await tx.payment.count({ where: { booking: { patient: { userId: { in: ids } } } } });
      return { due: ids.length, anonymised: ids.length, sessionsDeleted: sessions.count, codesDeleted: codes.count, bookingsKept, paymentsKept };
    });
    // Counts only: never a name, an email or an id.
    log(`JOB END purge-deleted-accounts accounts_anonymised=${result.anonymised} sessions_deleted=${result.sessionsDeleted} codes_deleted=${result.codesDeleted} bookings_kept=${result.bookingsKept} payments_kept=${result.paymentsKept} duration_ms=${Math.round(performance.now() - started)}`);
    return result;
  } catch (error) {
    // The transaction rolled back: nothing changed. Say so, then let the job fail so the queue records it.
    // The error CODE only (for example P2002, a unique rule): Prisma's full message can quote the data.
    const code = (error as { code?: string } | null)?.code ?? (error instanceof Error ? error.name : "unknown");
    log(`JOB FAILED purge-deleted-accounts nothing_changed=true reason=${code}`);
    throw error;
  }
}
