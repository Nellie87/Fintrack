import { handle, readJson } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { transactionSchema } from "@/lib/schemas";
import { findOwnedPortfolio } from "@/lib/portfolios";
import { createTransaction, listTransactions } from "@/lib/transactions";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/portfolios/{id}/transactions: newest trade first. */
export const GET = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const portfolio = await findOwnedPortfolio(user.id, (await params).id);
  return Response.json(await listTransactions(portfolio.id));
});

/** POST /api/portfolios/{id}/transactions: 422 if a SELL exceeds holdings on its trade date. */
export const POST = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const portfolio = await findOwnedPortfolio(user.id, (await params).id);
  const input = transactionSchema.parse(await readJson(req));
  return Response.json(await createTransaction(portfolio.id, input), { status: 201 });
});
