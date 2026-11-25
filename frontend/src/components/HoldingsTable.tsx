import type { Currency, Holding } from "../api/types";
import { formatAmount, formatNumber, formatSignedMoney, formatSignedPercent, signClass } from "../lib/format";

/** Per-instrument holdings. Numbers are right-aligned with tabular digits; the currency is named in each money header. */
export function HoldingsTable({ holdings, currency }: { holdings: Holding[]; currency: Currency }) {
  return (
    <div className="table-wrap" tabIndex={0} aria-labelledby="holdings-caption">
      <table className="table">
        <caption id="holdings-caption" className="visually-hidden">
          Holdings by instrument, amounts in {currency}
        </caption>
        <thead>
          <tr>
            <th scope="col">Instrument</th>
            <th scope="col" className="num">Net qty</th>
            <th scope="col" className="num">Avg cost ({currency})</th>
            <th scope="col" className="num">Market price ({currency})</th>
            <th scope="col" className="num">Invested ({currency})</th>
            <th scope="col" className="num">Value ({currency})</th>
            <th scope="col" className="num">Gain / loss</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const cls = signClass(h.gain);
            return (
              <tr key={h.instrument}>
                <th scope="row" className="table__instrument">{h.instrument}</th>
                <td className="num">{formatNumber(h.netQuantity)}</td>
                <td className="num">{formatNumber(h.averageCost)}</td>
                <td className="num">{formatNumber(h.marketPrice)}</td>
                <td className="num">{formatAmount(h.totalInvested)}</td>
                <td className="num">{formatAmount(h.totalValue)}</td>
                <td className={["num", cls].filter(Boolean).join(" ")}>
                  {formatSignedMoney(h.gain, currency)}
                  <span className="table__sub">{formatSignedPercent(h.gainPct)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
