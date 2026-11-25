import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Currency, Holding } from "../api/types";
import { formatMoney } from "../lib/format";

/** Brand chart palette from tokens.css; beyond six instruments the rest are grouped as "Other". */
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];
const MAX_SLICES = COLORS.length;

type Slice = { name: string; value: number; pct: number };

function toSlices(holdings: Holding[]): Slice[] {
  const total = holdings.reduce((sum, h) => sum + h.totalValue, 0);
  const sorted = [...holdings].sort((a, b) => b.totalValue - a.totalValue);
  const top = sorted.slice(0, MAX_SLICES - 1);
  const rest = sorted.slice(MAX_SLICES - 1);
  const rows = top.map((h) => ({ name: h.instrument, value: h.totalValue }));
  if (rest.length === 1) rows.push({ name: rest[0].instrument, value: rest[0].totalValue });
  if (rest.length > 1) rows.push({ name: `Other (${rest.length})`, value: rest.reduce((s, h) => s + h.totalValue, 0) });
  return rows.map((r) => ({ ...r, pct: total ? (r.value / total) * 100 : 0 }));
}

const pctFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Allocation donut: market value by instrument.
 * The SVG is decorative for screen readers; the legend beside it is a real table with
 * the same numbers, so nothing is conveyed by colour or shape alone.
 */
export function AllocationChart({ holdings, currency }: { holdings: Holding[]; currency: Currency }) {
  const slices = toSlices(holdings);
  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <figure className="allocation card">
      <figcaption className="allocation__title">Allocation by market value</figcaption>
      <div className="allocation__body">
        <div className="allocation__chart" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={slices.length > 1 ? 1.5 : 0}
                stroke="var(--color-surface)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {slices.map((s, i) => (
                  <Cell key={s.name} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatMoney(Number(value), currency)}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--color-border)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="allocation__center">
            <span className="allocation__center-label">Total value</span>
            <span className="allocation__center-value">{formatMoney(total, currency)}</span>
          </div>
        </div>

        <table className="allocation__legend">
          <caption className="visually-hidden">Allocation by market value, in {currency}</caption>
          <thead className="visually-hidden">
            <tr>
              <th scope="col">Instrument</th>
              <th scope="col">Value</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((s, i) => (
              <tr key={s.name}>
                <th scope="row">
                  <span className="swatch" style={{ background: COLORS[i % COLORS.length] }} aria-hidden="true" />
                  {s.name}
                </th>
                <td className="num">{formatMoney(s.value, currency)}</td>
                <td className="num allocation__pct">{pctFmt.format(s.pct)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
