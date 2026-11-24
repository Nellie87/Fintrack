import { db } from "@/lib/db";
import { handle, readJson } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { portfolioSchema } from "@/lib/schemas";
import { portfolioSelect } from "@/lib/portfolios";

/** GET /api/portfolios: the logged-in analyst's portfolios, newest first. */
export const GET = handle(async (req) => {
  const user = await requireUser(req);
  const rows = await db.portfolio.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { ...portfolioSelect, _count: { select: { transactions: true } } },
  });
  const portfolios = rows.map(({ _count, ...p }) => ({ ...p, transactionCount: _count.transactions }));
  return Response.json(portfolios);
});

/** POST /api/portfolios: create a portfolio owned by the logged-in analyst. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const input = portfolioSchema.parse(await readJson(req));
  const portfolio = await db.portfolio.create({
    data: { ...input, userId: user.id },
    select: portfolioSelect,
  });
  return Response.json(portfolio, { status: 201 });
});
