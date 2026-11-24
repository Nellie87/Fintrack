import { db } from "@/lib/db";
import { handle } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { findOwnedPortfolio } from "@/lib/portfolios";
import { summarize } from "@/lib/holdings";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/portfolios/{id}/summary
 * Per-instrument net quantity, average cost, total invested and total value,
 * plus portfolio totals. Market price = latest trade price (no live price feed).
 */
export const GET = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const portfolio = await findOwnedPortfolio(user.id, (await params).id);
  const trades = await db.transaction.findMany({ where: { portfolioId: portfolio.id } });

  return Response.json({
    portfolioId: portfolio.id,
    currency: portfolio.baseCurrency,
    ...summarize(trades),
  });
});
