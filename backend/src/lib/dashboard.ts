import Decimal from "decimal.js";
import { summarize, type Trade } from "./holdings";

/**
 * Analyst dashboard: KPIs across all of an analyst's portfolios.
 * Pure function (no database), built on the same summarize() as each portfolio's summary.
 * Totals are kept per currency: KES and USD are never added together (no FX feed).
 */

type Currency = "KES" | "USD";

export type DashboardPortfolio = {
  id: number;
  name: string;
  clientName: string;
  baseCurrency: Currency;
  transactions: (Trade & { id: number; tradeDate: Date; createdAt: Date })[];
};

export type Dashboard = {
  portfolioCount: number;
  clientCount: number;
  transactionCount: number;
  byCurrency: {
    currency: Currency;
    portfolioCount: number;
    totalInvested: number;
    totalValue: number;
    gain: number;
    gainPct: number;
  }[];
  bestPerformer: PositionRef | null;
  worstPerformer: PositionRef | null;
  topPositions: PositionRef[];
  recentTransactions: {
    id: number;
    portfolioId: number;
    portfolioName: string;
    currency: Currency;
    instrument: string;
    type: "BUY" | "SELL";
    quantity: number;
    unitPrice: number;
    tradeDate: string;
  }[];
};

type PositionRef = {
  portfolioId: number;
  portfolioName: string;
  currency: Currency;
  instrument: string;
  totalValue: number;
  gain: number;
  gainPct: number;
};

const money = (d: Decimal) => d.toDecimalPlaces(2).toNumber();

export function buildDashboard(portfolios: DashboardPortfolio[]): Dashboard {
  const totals = new Map<Currency, { portfolios: number; invested: Decimal; value: Decimal }>();
  const positions: PositionRef[] = [];

  for (const p of portfolios) {
    const { holdings, totals: t } = summarize(p.transactions);
    const acc = totals.get(p.baseCurrency) ?? { portfolios: 0, invested: new Decimal(0), value: new Decimal(0) };
    acc.portfolios += 1;
    acc.invested = acc.invested.plus(t.totalInvested);
    acc.value = acc.value.plus(t.totalValue);
    totals.set(p.baseCurrency, acc);

    for (const h of holdings) {
      positions.push({
        portfolioId: p.id,
        portfolioName: p.name,
        currency: p.baseCurrency,
        instrument: h.instrument,
        totalValue: h.totalValue,
        gain: h.gain,
        gainPct: h.gainPct,
      });
    }
  }

  const byCurrency = (["KES", "USD"] as const)
    .filter((c) => totals.has(c))
    .map((currency) => {
      const { portfolios: count, invested, value } = totals.get(currency)!;
      const gain = value.minus(invested);
      return {
        currency,
        portfolioCount: count,
        totalInvested: money(invested),
        totalValue: money(value),
        gain: money(gain),
        gainPct: invested.isZero() ? 0 : gain.dividedBy(invested).times(100).toDecimalPlaces(2).toNumber(),
      };
    });

  // Percentages compare fairly across currencies; values only within one currency.
  const byPct = [...positions].sort((a, b) => b.gainPct - a.gainPct);
  const topPositions = [...positions]
    .sort((a, b) => a.currency.localeCompare(b.currency) || b.totalValue - a.totalValue)
    .filter((pos, i, all) => all.slice(0, i).filter((x) => x.currency === pos.currency).length < 3);

  // Newest trade date first; same-day trades by when they were entered.
  const recentTransactions = portfolios
    .flatMap((p) => p.transactions.map((t) => ({ p, t })))
    .sort(
      (a, b) =>
        b.t.tradeDate.getTime() - a.t.tradeDate.getTime() ||
        b.t.createdAt.getTime() - a.t.createdAt.getTime() ||
        b.t.id - a.t.id,
    )
    .slice(0, 6)
    .map(({ p, t }) => ({
      id: t.id,
      portfolioId: p.id,
      portfolioName: p.name,
      currency: p.baseCurrency,
      instrument: t.instrument,
      type: t.type,
      quantity: new Decimal(t.quantity.toString()).toNumber(),
      unitPrice: new Decimal(t.unitPrice.toString()).toNumber(),
      tradeDate: t.tradeDate.toISOString().slice(0, 10),
    }));

  return {
    portfolioCount: portfolios.length,
    clientCount: new Set(portfolios.map((p) => p.clientName.trim().toLowerCase())).size,
    transactionCount: portfolios.reduce((n, p) => n + p.transactions.length, 0),
    byCurrency,
    bestPerformer: byPct[0] ?? null,
    worstPerformer: byPct.length > 1 ? byPct[byPct.length - 1] : null,
    topPositions,
    recentTransactions,
  };
}
