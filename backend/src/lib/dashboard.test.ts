import { describe, expect, it } from "vitest";
import { buildDashboard, type DashboardPortfolio } from "./dashboard";

let nextId = 1;
const trade = (instrument: string, type: "BUY" | "SELL", quantity: number, unitPrice: number, date: string) => ({
  id: nextId++,
  instrument,
  type,
  quantity,
  unitPrice,
  tradeDate: new Date(`${date}T00:00:00Z`),
  createdAt: new Date(`${date}T09:00:00Z`),
});

const portfolios: DashboardPortfolio[] = [
  {
    id: 1,
    name: "Growth",
    clientName: "Acacia Family Trust",
    baseCurrency: "KES",
    transactions: [trade("SCOM", "BUY", 1000, 16, "2026-10-01"), trade("SCOM", "BUY", 0.0001, 20, "2026-11-01")],
  },
  {
    id: 2,
    name: "Income",
    clientName: "acacia family trust ", // same client, different spelling
    baseCurrency: "KES",
    transactions: [trade("KCB", "BUY", 100, 40, "2026-10-05"), trade("KCB", "BUY", 0.0001, 36, "2026-11-05")],
  },
  {
    id: 3,
    name: "Global",
    clientName: "Jacaranda Endowment Fund",
    baseCurrency: "USD",
    transactions: [trade("VTI", "BUY", 10, 250, "2026-09-01")],
  },
];

describe("buildDashboard", () => {
  const d = buildDashboard(portfolios);

  it("counts portfolios, distinct clients and trades", () => {
    expect(d.portfolioCount).toBe(3);
    expect(d.clientCount).toBe(2);
    expect(d.transactionCount).toBe(5);
  });

  it("keeps KES and USD totals separate instead of adding them up", () => {
    expect(d.byCurrency.map((c) => c.currency)).toEqual(["KES", "USD"]);
    const kes = d.byCurrency[0];
    expect(kes.portfolioCount).toBe(2);
    expect(kes.totalInvested).toBe(20000); // 16,000 SCOM + 4,000 KCB
    expect(kes.totalValue).toBe(23600); // SCOM at 20 = 20,000; KCB at 36 = 3,600
    expect(kes.gain).toBe(3600);
    expect(d.byCurrency[1]).toMatchObject({ currency: "USD", totalInvested: 2500, totalValue: 2500, gain: 0 });
  });

  it("finds the best and worst positions by percentage gain", () => {
    expect(d.bestPerformer).toMatchObject({ instrument: "SCOM", portfolioName: "Growth" });
    expect(d.worstPerformer).toMatchObject({ instrument: "KCB", portfolioName: "Income" });
  });

  it("lists the most recent trades first", () => {
    expect(d.recentTransactions[0]).toMatchObject({ instrument: "KCB", tradeDate: "2026-11-05", portfolioName: "Income" });
    expect(d.recentTransactions.at(-1)).toMatchObject({ instrument: "VTI" });
  });

  it("returns an empty, valid dashboard for an analyst with no portfolios", () => {
    expect(buildDashboard([])).toEqual({
      portfolioCount: 0,
      clientCount: 0,
      transactionCount: 0,
      byCurrency: [],
      bestPerformer: null,
      worstPerformer: null,
      topPositions: [],
      recentTransactions: [],
    });
  });
});
