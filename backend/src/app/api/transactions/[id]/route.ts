import { handle } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { deleteTransaction } from "@/lib/transactions";

type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/transactions/{id}: 422 if a later sell depends on this trade. */
export const DELETE = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  await deleteTransaction(user.id, (await params).id);
  return new Response(null, { status: 204 });
});
