import Decimal from "decimal.js";
import { ApiError } from "./errors";

/**
 * Holdings maths: weighted average cost.
 *
 * Pure functions with no database access, so the rules are easy to test
 * and the same code both validates new trades and builds the summary.
 * All arithmetic uses Decimal; values are rounded only when output.
 */

type DecimalLike = Decimal.Value | { toString(): string };

export type Trade = {
  id?: number;
  instrument: string;
  type: "BUY" | "SELL";
  quantity: DecimalLike;
  unitPrice: DecimalLike;
  tradeDate: Date | string;
  /** Breaks ties between trades on the same date; a trade not yet saved sorts last. */
  createdAt?: Date | string;
};

export type Position = {
  instrument: string;
  quantity: Decimal;
  averageCost: Decimal;
  /** Price of the most recent trade, used as the market price (no live price feed). */
  lastPrice: Decimal;
};

const dec = (v: DecimalLike) => new Decimal(v.toString());
const time = (d: Date | string | undefined) =>
  d === undefined ? Number.POSITIVE_INFINITY : new Date(d).getTime();
const isoDate = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

/** Chronological order: trade date, then creation time, then id. */
export function sortTrades<T extends Trade>(trades: T[]): T[] {
  return [...trades].sort(
    (a, b) =>
      time(a.tradeDate) - time(b.tradeDate) ||
      time(a.createdAt) - time(b.createdAt) ||
      (a.id ?? Number.POSITIVE_INFINITY) - (b.id ?? Number.POSITIVE_INFINITY),
  );
}

/**
 * Replays trades in date order and returns the open position per instrument.
 *   BUY:  avg = (qty × avg + buyQty × price) ÷ (qty + buyQty); qty += buyQty
 *   SELL: qty -= sellQty; avg unchanged
 * Throws 422 INSUFFICIENT_HOLDINGS if a sell exceeds what is held on its date,
 * which also catches a back-dated sell placed before the matching buy.
 */
export function computePositions(trades: Trade[]): Position[] {
  const positions = new Map<string, Position>();

  for (const t of sortTrades(trades)) {
    const qty = dec(t.quantity);
    const price = dec(t.unitPrice);
    const p = positions.get(t.instrument) ?? {
      instrument: t.instrument,
      quantity: new Decimal(0),
      averageCost: new Decimal(0),
      lastPrice: price,
    };

    if (t.type === "BUY") {
      const cost = p.quantity.times(p.averageCost).plus(qty.times(price));
      p.quantity = p.quantity.plus(qty);
      p.averageCost = cost.dividedBy(p.quantity);
    } else {
      if (qty.greaterThan(p.quantity)) {
        const held = p.quantity.toString();
        throw new ApiError(
          422,
          "INSUFFICIENT_HOLDINGS",
          `Cannot sell ${qty.toString()} ${t.instrument}: only ${held} held on ${isoDate(t.tradeDate)}.`,
          [{ field: "quantity", message: `Exceeds holding of ${held}.` }],
        );
      }
      p.quantity = p.quantity.minus(qty);
    }

    p.lastPrice = price;
    positions.set(t.instrument, p);
  }

  return [...positions.values()];
}

export type HoldingSummary = {
  instrument: string;
  netQuantity: number;
  averageCost: number;
  totalInvested: number;
  marketPrice: number;
  totalValue: number;
  gain: number;
  gainPct: number;
};

export type PortfolioTotals = {
  totalInvested: number;
  totalValue: number;
  gain: number;
  gainPct: number;
};

const money = (d: Decimal) => d.toDecimalPlaces(2).toNumber();
const qty4 = (d: Decimal) => d.toDecimalPlaces(4).toNumber();
const pct = (gain: Decimal, invested: Decimal) =>
  invested.isZero() ? 0 : gain.dividedBy(invested).times(100).toDecimalPlaces(2).toNumber();

/**
 * Builds the summary for open positions (net quantity > 0), largest value first.
 *   totalInvested = qty × average cost   (cost of what is still held)
 *   totalValue    = qty × last trade price
 *   gain          = value − invested;  gainPct = gain ÷ invested × 100
 */
export function summarize(trades: Trade[]): { holdings: HoldingSummary[]; totals: PortfolioTotals } {
  let invested = new Decimal(0);
  let value = new Decimal(0);

  const holdings = computePositions(trades)
    .filter((p) => p.quantity.greaterThan(0))
    .map((p) => {
      const inv = p.quantity.times(p.averageCost);
      const val = p.quantity.times(p.lastPrice);
      const gain = val.minus(inv);
      invested = invested.plus(inv);
      value = value.plus(val);
      return {
        instrument: p.instrument,
        netQuantity: qty4(p.quantity),
        averageCost: qty4(p.averageCost),
        totalInvested: money(inv),
        marketPrice: qty4(p.lastPrice),
        totalValue: money(val),
        gain: money(gain),
        gainPct: pct(gain, inv),
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue);

  const gain = value.minus(invested);
  return {
    holdings,
    totals: {
      totalInvested: money(invested),
      totalValue: money(value),
      gain: money(gain),
      gainPct: pct(gain, invested),
    },
  };
}
