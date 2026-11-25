import { handle, readJson } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { paginationSchema, transactionSchema } from "@/lib/schemas";
import { findOwnedPortfolio } from "@/lib/portfolios";
import { createTransaction, listTransactions } from "@/lib/transactions";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/portfolios/{id}/transactions: newest trade first.
 * Optional ?page=1&pageSize=20 returns one page; the total is in the X-Total-Count header.
 * The body stays a plain array either way, so existing clients are unaffected.
 */
export const GET = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const portfolio = await findOwnedPortfolio(user.id, (await params).id);
  const query = new URL(req.url).searchParams;
  const page = paginationSchema.parse({
    page: query.get("page") ?? undefined,
    pageSize: query.get("pageSize") ?? undefined,
  });

  const { items, total } = await listTransactions(portfolio.id, page);
  const headers: Record<string, string> = { "X-Total-Count": String(total) };
  if (page) {
    headers["X-Page"] = String(page.page);
    headers["X-Page-Size"] = String(page.pageSize);
  }
  return Response.json(items, { headers });
});

/** POST /api/portfolios/{id}/transactions: 422 if a SELL exceeds holdings on its trade date. */
export const POST = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const portfolio = await findOwnedPortfolio(user.id, (await params).id);
  const input = transactionSchema.parse(await readJson(req));
  return Response.json(await createTransaction(portfolio.id, input), { status: 201 });
});
