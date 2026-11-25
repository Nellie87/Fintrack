import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatNumber, formatSignedMoney, formatSignedPercent, signClass } from "./format";

describe("financial formatting", () => {
  it("prints money with the currency code first and two decimals", () => {
    expect(formatMoney(1250000, "KES")).toBe("KES 1,250,000.00");
    expect(formatMoney(96.5, "USD")).toBe("USD 96.50");
  });

  it("signs gains and losses with + and a real minus sign", () => {
    expect(formatSignedMoney(2160, "KES")).toBe("+KES 2,160.00");
    expect(formatSignedMoney(-400, "KES")).toBe("−KES 400.00");
    expect(formatSignedMoney(0, "USD")).toBe("USD 0.00");
    expect(formatSignedPercent(10.47)).toBe("+10.47%");
    expect(formatSignedPercent(-5.26)).toBe("−5.26%");
  });

  it("colours a value only when it carries a sign", () => {
    expect(signClass(1)).toBe("gain");
    expect(signClass(-1)).toBe("loss");
    expect(signClass(0)).toBeUndefined();
  });

  it("shows quantities without trailing zeros and dates in a readable form", () => {
    expect(formatNumber(1500)).toBe("1,500");
    expect(formatNumber(17.2)).toBe("17.2");
    expect(formatDate("2026-11-20")).toBe("20 Nov 2026");
  });
});
