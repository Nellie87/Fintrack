import { describe, expect, it } from "vitest";
import { ApiError } from "./errors";
import { computePositions, summarize, type Trade } from "./holdings";

const buy = (instrument: string, quantity: string, unitPrice: string, tradeDate: string, extra: Partial<Trade> = {}): Trade => ({
  instrument, type: "BUY", quantity, unitPrice, tradeDate, ...extra,
});
const sell = (instrument: string, quantity: string, unitPrice: string, tradeDate: string, extra: Partial<Trade> = {}): Trade => ({
  instrument, type: "SELL", quantity, unitPrice, tradeDate, ...extra,
});

/** Runs fn and returns the ApiError it throws (fails the test if it doesn't throw one). */
function catchApiError(fn: () => unknown): ApiError {
  try {
    fn();
  } catch (err) {
    if (err instanceof ApiError) return err;
    throw err;
  }
  throw new Error("Expected an ApiError to be thrown");
}

describe("computePositions", () => {
  it("records a single buy at its own price", () => {
    const [scom] = computePositions([buy("SCOM", "1000", "16", "2026-10-01")]);
    expect(scom.quantity.toNumber()).toBe(1000);
    expect(scom.averageCost.toNumber()).toBe(16);
  });

  it("averages two buys weighted by quantity", () => {
    const [scom] = computePositions([
      buy("SCOM", "1000", "16.00", "2026-10-01"),
      buy("SCOM", "500", "19.60", "2026-10-15"),
    ]);
    // (1000 × 16 + 500 × 19.60) / 1500 = 25800 / 1500 = 17.20
    expect(scom.quantity.toNumber()).toBe(1500);
    expect(scom.averageCost.toNumber()).toBe(17.2);
  });

  it("keeps the average cost unchanged after a partial sell", () => {
    const [scom] = computePositions([
      buy("SCOM", "1000", "16.00", "2026-10-01"),
      buy("SCOM", "500", "19.60", "2026-10-15"),
      sell("SCOM", "300", "19.00", "2026-10-20"),
    ]);
    expect(scom.quantity.toNumber()).toBe(1200);
    expect(scom.averageCost.toNumber()).toBe(17.2);
  });

  it("rejects selling more than is held with 422 INSUFFICIENT_HOLDINGS", () => {
    const err = catchApiError(() =>
      computePositions([buy("KCB", "300", "40", "2026-11-01"), sell("KCB", "500", "42", "2026-11-20")]),
    );
    expect(err.status).toBe(422);
    expect(err.code).toBe("INSUFFICIENT_HOLDINGS");
    expect(err.message).toBe("Cannot sell 500 KCB: only 300 held on 2026-11-20.");
    expect(err.details).toEqual([{ field: "quantity", message: "Exceeds holding of 300." }]);
  });

  it("rejects a back-dated sell that happens before the matching buy", () => {
    // Entered after the buy, but its trade date is earlier, so nothing was held yet.
    const err = catchApiError(() =>
      computePositions([buy("EQTY", "100", "45", "2026-11-10"), sell("EQTY", "50", "47", "2026-11-05")]),
    );
    expect(err.message).toBe("Cannot sell 50 EQTY: only 0 held on 2026-11-05.");
  });

  it("rejects deleting a buy that a later sell depends on", () => {
    const trades = [
      buy("EABL", "100", "150", "2026-10-01", { id: 1 }),
      buy("EABL", "100", "160", "2026-10-02", { id: 2 }),
      sell("EABL", "150", "170", "2026-10-03", { id: 3 }),
    ];
    expect(() => computePositions(trades)).not.toThrow();
    // Deleting trade 1 leaves 100 held when 150 are sold.
    expect(() => computePositions(trades.filter((t) => t.id !== 1))).toThrow(ApiError);
  });

  it("orders same-day trades by creation time, with an unsaved trade last", () => {
    const saved = [
      buy("SCOM", "100", "18", "2026-11-01", { id: 1, createdAt: "2026-11-01T08:00:00Z" }),
      sell("SCOM", "100", "19", "2026-11-01", { id: 2, createdAt: "2026-11-01T09:00:00Z" }),
    ];
    expect(() => computePositions(saved)).not.toThrow();

    // A new same-day sell (no createdAt yet) is checked after both saved trades: nothing left to sell.
    expect(() => computePositions([...saved, sell("SCOM", "1", "19", "2026-11-01")])).toThrow(ApiError);
  });
});

describe("summarize", () => {
  it("values holdings at the last trade price and totals the portfolio", () => {
    const { holdings, totals } = summarize([
      buy("SCOM", "1000", "16.00", "2026-10-01"),
      buy("SCOM", "500", "19.60", "2026-10-15"),
      sell("SCOM", "300", "19.00", "2026-10-20"),
      buy("KCB", "100", "40", "2026-10-05"),
      buy("KCB", "100", "36", "2026-10-25"),
    ]);

    expect(holdings).toEqual([
      // 1200 × 17.20 = 20640 invested; 1200 × 19.00 = 22800 value
      { instrument: "SCOM", netQuantity: 1200, averageCost: 17.2, totalInvested: 20640, marketPrice: 19,
        totalValue: 22800, gain: 2160, gainPct: 10.47 },
      // 200 × 38 = 7600 invested; 200 × 36 = 7200 value: a loss
      { instrument: "KCB", netQuantity: 200, averageCost: 38, totalInvested: 7600, marketPrice: 36,
        totalValue: 7200, gain: -400, gainPct: -5.26 },
    ]);
    expect(totals).toEqual({ totalInvested: 28240, totalValue: 30000, gain: 1760, gainPct: 6.23 });
  });

  it("leaves out instruments that have been fully sold", () => {
    const { holdings, totals } = summarize([
      buy("KCB", "200", "40", "2026-10-02"),
      sell("KCB", "200", "45", "2026-10-20"),
    ]);
    expect(holdings).toEqual([]);
    expect(totals).toEqual({ totalInvested: 0, totalValue: 0, gain: 0, gainPct: 0 });
  });

  it("uses exact decimal maths, not floating point", () => {
    // In plain JS, 0.1 + 0.2 = 0.30000000000000004.
    const { totals } = summarize([
      buy("T-BILL-91", "1", "0.1", "2026-11-01"),
      buy("T-BILL-91", "1", "0.2", "2026-11-02"),
    ]);
    expect(totals.totalInvested).toBe(0.3);
  });
});
