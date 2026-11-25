import { db } from "@/lib/db";
import { handle } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { buildDashboard } from "@/lib/dashboard";

/** GET /api/dashboard: KPIs across the logged-in analyst's portfolios, per currency. */
export const GET = handle(async (req) => {
  const user = await requireUser(req);
  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, clientName: true, baseCurrency: true, transactions: true },
  });
  return Response.json(buildDashboard(portfolios));
});
