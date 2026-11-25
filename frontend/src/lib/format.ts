import type { Currency } from "../api/types";

/**
 * Display formatting for money, quantities, percentages and dates.
 * Rounding happens only here, at display time; the API sends exact values.
 */

const twoDp = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const upToFourDp = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

/** "KES 1,250,000.00": currency code first, as in the brief (style:"currency" would print "Ksh"). */
export function formatMoney(amount: number, currency: Currency): string {
  return `${currency} ${twoDp.format(amount)}`;
}

/** Money inside a table whose header already names the currency: "1,250,000.00". */
export function formatAmount(amount: number): string {
  return twoDp.format(amount);
}

/** Quantities and unit prices: up to 4 decimals, no trailing zeros. "1,500" or "17.2". */
export function formatNumber(value: number): string {
  return upToFourDp.format(value);
}

/** Uses a real minus sign (−) so it reads clearly next to "+". */
function sign(value: number): string {
  if (value > 0) return "+";
  if (value < 0) return "−";
  return "";
}

/** "+KES 2,160.00" / "−KES 400.00" / "KES 0.00". */
export function formatSignedMoney(amount: number, currency: Currency): string {
  return `${sign(amount)}${currency} ${twoDp.format(Math.abs(amount))}`;
}

/** "+10.47%" / "−5.26%" / "0.00%". */
export function formatSignedPercent(value: number): string {
  return `${sign(value)}${twoDp.format(Math.abs(value))}%`;
}

/**
 * CSS class for a signed value. Green/red only ever accompany a +/− sign,
 * so colour is never the only way the meaning is shown.
 */
export function signClass(value: number): "gain" | "loss" | undefined {
  if (value > 0) return "gain";
  if (value < 0) return "loss";
  return undefined;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "20 Nov 2026" from "2026-11-20" or an ISO timestamp. */
export function formatDate(value: string): string {
  const iso = value.length === 10 ? `${value}T00:00:00Z` : value;
  return dateFmt.format(new Date(iso));
}
