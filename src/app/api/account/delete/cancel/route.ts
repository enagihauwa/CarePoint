import { tokenFromRequest, userForToken } from "@/lib/currentUser";
import { prisma } from "@/lib/db";
import { respond } from "@/lib/respond";
import { sameOrigin } from "@/lib/session";

const refuse = (request: Request, started: number, status: number, code: string, error: string) =>
  respond(request, started, status, { error, code });

// Changing your mind. Only possible while the account is still "pending_deletion": once the nightly purge has
// anonymised it, the identity is gone and nothing can bring it back.
export async function POST(request: Request) {
  const started = performance.now();

  if (!sameOrigin(request)) return refuse(request, started, 403, "bad_origin", "Request refused.");

  try {
    const user = await userForToken(tokenFromRequest(request));
    if (!user) return refuse(request, started, 401, "login_required", "Log in to continue.");
    if (user.role !== "patient") return refuse(request, started, 403, "not_a_patient", "Only patient accounts can be changed here.");

    const changed = await prisma.user.updateMany({ where: { id: user.id, status: "pending_deletion" }, data: { status: "active", deletionRequestedAt: null } });
    if (changed.count !== 1) return refuse(request, started, 409, "not_pending", "Your account is not scheduled for deletion.");

    console.log(`Deletion cancelled: user=${user.id}`);
    return respond(request, started, 200, { cancelled: true });
  } catch (error) {
    console.error("Cancelling the deletion failed:", error instanceof Error ? error.message : error);
    return respond(request, started, 500, { error: "We could not cancel the deletion. Your account is unchanged. Please try again." });
  }
}
