import { describe, expect, it } from "vitest";
import { portfolioSchema, registerSchema, transactionSchema } from "./schemas";

const fieldsWithErrors = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.success ? [] : result.error!.issues.map((i) => i.path.join("."));

describe("registerSchema", () => {
  it("normalises the email and accepts a strong password", () => {
    const parsed = registerSchema.parse({ name: " Jane Analyst ", email: "  Jane@Example.COM ", password: "Passw0rd!" });
    expect(parsed).toEqual({ name: "Jane Analyst", email: "jane@example.com", password: "Passw0rd!" });
  });

  it("rejects a short name, a bad email and a weak password", () => {
    const result = registerSchema.safeParse({ name: "J", email: "nope", password: "password" });
    expect(fieldsWithErrors(result)).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });
});

describe("portfolioSchema", () => {
  it("only allows KES or USD as the base currency", () => {
    expect(portfolioSchema.safeParse({ name: "Growth", clientName: "Acacia Family Trust", baseCurrency: "KES" }).success).toBe(true);
    expect(fieldsWithErrors(portfolioSchema.safeParse({ name: "Growth", clientName: "Acacia", baseCurrency: "EUR" }))).toEqual([
      "baseCurrency",
    ]);
  });
});

describe("transactionSchema", () => {
  const valid = { instrument: " scom ", type: "BUY", quantity: 1000, unitPrice: 17.5, tradeDate: "2026-11-20" };

  it("upper-cases and trims the ticker", () => {
    expect(transactionSchema.parse(valid).instrument).toBe("SCOM");
  });

  it("rejects negative or zero quantities and prices", () => {
    expect(fieldsWithErrors(transactionSchema.safeParse({ ...valid, quantity: -5, unitPrice: 0 }))).toEqual([
      "quantity",
      "unitPrice",
    ]);
  });

  it("rejects unknown types, malformed tickers and future trade dates", () => {
    const result = transactionSchema.safeParse({ ...valid, instrument: "!!", type: "HOLD", tradeDate: "2099-01-01" });
    expect(fieldsWithErrors(result)).toEqual(expect.arrayContaining(["instrument", "type", "tradeDate"]));
  });
});
