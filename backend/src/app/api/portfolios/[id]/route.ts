import { db } from "@/lib/db";
import { handle, readJson } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { portfolioSchema } from "@/lib/schemas";
import { findOwnedPortfolio, portfolioSelect } from "@/lib/portfolios";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/portfolios/{id} */
export const GET = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id } = await params;
  return Response.json(await findOwnedPortfolio(user.id, id));
});

/** PUT /api/portfolios/{id}: full update (name, clientName, baseCurrency). */
export const PUT = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id } = await params;
  const existing = await findOwnedPortfolio(user.id, id);
  const input = portfolioSchema.parse(await readJson(req));
  const portfolio = await db.portfolio.update({
    where: { id: existing.id },
    data: input,
    select: portfolioSelect,
  });
  return Response.json(portfolio);
});

/** DELETE /api/portfolios/{id}: also removes its transactions (cascade). */
export const DELETE = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const { id } = await params;
  const existing = await findOwnedPortfolio(user.id, id);
  await db.portfolio.delete({ where: { id: existing.id } });
  return new Response(null, { status: 204 });
});
