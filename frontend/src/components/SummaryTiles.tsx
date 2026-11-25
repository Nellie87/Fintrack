import type { Currency, Totals } from "../api/types";
import { formatMoney, formatSignedMoney, formatSignedPercent, signClass } from "../lib/format";

/** Headline figures for a portfolio. Gain is the only coloured value, and it always carries a +/− sign. */
export function SummaryTiles({ totals, currency, holdingsCount }: { totals: Totals; currency: Currency; holdingsCount: number }) {
  const gainClass = signClass(totals.gain);
  return (
    <dl className="tiles">
      <div className="tile card">
        <dt>Total invested</dt>
        <dd className="tile__value num">{formatMoney(totals.totalInvested, currency)}</dd>
        <dd className="tile__note">Cost of current holdings</dd>
      </div>
      <div className="tile card">
        <dt>Market value</dt>
        <dd className="tile__value num">{formatMoney(totals.totalValue, currency)}</dd>
        <dd className="tile__note">At latest trade prices</dd>
      </div>
      <div className="tile card">
        <dt>Unrealised gain / loss</dt>
        <dd className={["tile__value", "num", gainClass].filter(Boolean).join(" ")}>
          {formatSignedMoney(totals.gain, currency)}
        </dd>
        <dd className={["tile__note", gainClass].filter(Boolean).join(" ")}>{formatSignedPercent(totals.gainPct)}</dd>
      </div>
      <div className="tile card">
        <dt>Open positions</dt>
        <dd className="tile__value num">{holdingsCount}</dd>
        <dd className="tile__note">{holdingsCount === 1 ? "Instrument held" : "Instruments held"}</dd>
      </div>
    </dl>
  );
}
