import { handle } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { findOwnedPortfolio } from "@/lib/portfolios";
import { transactionsCsv } from "@/lib/transactions";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/portfolios/{id}/transactions/export: every transaction as a CSV download. */
export const GET = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const portfolio = await findOwnedPortfolio(user.id, (await params).id);
  const csv = await transactionsCsv(portfolio.id, portfolio.baseCurrency);

  const slug = portfolio.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "portfolio";
  const filename = `${slug}-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
