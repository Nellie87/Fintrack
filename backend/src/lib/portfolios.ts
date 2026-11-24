import { db } from "./db";
import { notFound, parseId } from "./errors";

/** Fields returned to clients; user_id stays internal. */
export const portfolioSelect = {
  id: true,
  name: true,
  clientName: true,
  baseCurrency: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Loads a portfolio only if it belongs to this analyst.
 * Someone else's portfolio gets the same 404 as a missing one,
 * so ids can't be probed to discover other analysts' data.
 */
export async function findOwnedPortfolio(userId: number, rawId: string) {
  const id = parseId(rawId, "Portfolio");
  const portfolio = await db.portfolio.findFirst({
    where: { id, userId },
    select: portfolioSelect,
  });
  if (!portfolio) throw notFound("Portfolio");
  return portfolio;
}
