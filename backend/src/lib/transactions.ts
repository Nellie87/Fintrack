import Decimal from "decimal.js";
import { db } from "./db";
import { ApiError, notFound, parseId } from "./errors";
import { computePositions } from "./holdings";
import type { TransactionInput } from "./schemas";

type TransactionRow = {
  id: number;
  portfolioId: number;
  instrument: string;
  type: "BUY" | "SELL";
  quantity: { toString(): string };
  unitPrice: { toString(): string };
  tradeDate: Date;
  createdAt: Date;
};

/** Converts a database row to the JSON shape: decimals as numbers, trade date as YYYY-MM-DD. */
export function serializeTransaction(t: TransactionRow) {
  const quantity = new Decimal(t.quantity.toString());
  const unitPrice = new Decimal(t.unitPrice.toString());
  return {
    id: t.id,
    portfolioId: t.portfolioId,
    instrument: t.instrument,
    type: t.type,
    quantity: quantity.toNumber(),
    unitPrice: unitPrice.toNumber(),
    total: quantity.times(unitPrice).toDecimalPlaces(2).toNumber(),
    tradeDate: t.tradeDate.toISOString().slice(0, 10),
    createdAt: t.createdAt.toISOString(),
  };
}

/** A portfolio's transactions, newest trade first. */
export async function listTransactions(portfolioId: number) {
  const rows = await db.transaction.findMany({
    where: { portfolioId },
    orderBy: [{ tradeDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  });
  return rows.map(serializeTransaction);
}

/**
 * Adds a trade after replaying the portfolio's history with it included.
 * computePositions throws 422 INSUFFICIENT_HOLDINGS if any sell would go negative.
 * Runs in a serializable transaction so two simultaneous sells can't both pass the check.
 */
export async function createTransaction(portfolioId: number, input: TransactionInput) {
  return db.$transaction(
    async (tx) => {
      const existing = await tx.transaction.findMany({ where: { portfolioId } });
      computePositions([...existing, { ...input, quantity: String(input.quantity), unitPrice: String(input.unitPrice) }]);

      const created = await tx.transaction.create({
        data: {
          portfolioId,
          instrument: input.instrument,
          type: input.type,
          quantity: String(input.quantity),
          unitPrice: String(input.unitPrice),
          tradeDate: new Date(`${input.tradeDate}T00:00:00Z`),
        },
      });
      return serializeTransaction(created);
    },
    { isolationLevel: "Serializable" },
  );
}

/**
 * Deletes a trade owned (through its portfolio) by this analyst.
 * Rejects with 422 if removing it would leave a later sell without enough holdings,
 * e.g. deleting the buy that a sell depends on.
 */
export async function deleteTransaction(userId: number, rawId: string) {
  const id = parseId(rawId, "Transaction");

  await db.$transaction(
    async (tx) => {
      const target = await tx.transaction.findFirst({ where: { id, portfolio: { userId } } });
      if (!target) throw notFound("Transaction");

      const remaining = await tx.transaction.findMany({
        where: { portfolioId: target.portfolioId, id: { not: id } },
      });
      try {
        computePositions(remaining);
      } catch (err) {
        if (err instanceof ApiError && err.code === "INSUFFICIENT_HOLDINGS") {
          // No form field is involved in a delete, so drop the field details and explain why.
          throw new ApiError(422, "INSUFFICIENT_HOLDINGS", `This trade can't be deleted because a later sell depends on it. ${err.message}`);
        }
        throw err;
      }

      await tx.transaction.delete({ where: { id } });
    },
    { isolationLevel: "Serializable" },
  );
}
