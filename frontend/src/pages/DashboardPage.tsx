import { Link } from "react-router";
import { useDashboard } from "../api/queries";
import type { Dashboard, PositionRef } from "../api/types";
import { useAuth } from "../auth/auth-context";
import { EmptyState, QueryView } from "../components/StateViews";
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatSignedMoney,
  formatSignedPercent,
  signClass,
} from "../lib/format";
import { usePageTitle } from "../lib/usePageTitle";

const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardPage() {
  usePageTitle("Dashboard");
  const { user } = useAuth();
  const dashboard = useDashboard();
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <>
      <div className="page-header">
        <div>
          <h1>
            {greeting()}, {firstName}
          </h1>
          <p className="page-header__sub">Here's how your clients' portfolios are doing today.</p>
        </div>
        <Link className="btn btn--primary" to="/portfolios">
          View portfolios
        </Link>
      </div>

      <QueryView
        query={dashboard}
        loadingLabel="Loading your dashboard…"
        isEmpty={(d) => d.portfolioCount === 0}
        empty={
          <EmptyState
            title="Welcome to FinTrack"
            action={
              <Link className="btn btn--primary" to="/portfolios">
                Create your first portfolio
              </Link>
            }
          >
            Set up a portfolio for a client, record their trades, and their holdings and performance will appear here.
          </EmptyState>
        }
      >
        {(d) => <DashboardBody d={d} />}
      </QueryView>
    </>
  );
}

function DashboardBody({ d }: { d: Dashboard }) {
  return (
    <div className="dashboard">
      <dl className="kpi-strip">
        <div className="kpi card">
          <dt>Portfolios</dt>
          <dd className="kpi__value num">{d.portfolioCount}</dd>
        </div>
        <div className="kpi card">
          <dt>Clients</dt>
          <dd className="kpi__value num">{d.clientCount}</dd>
        </div>
        <div className="kpi card">
          <dt>Trades recorded</dt>
          <dd className="kpi__value num">{d.transactionCount}</dd>
        </div>
      </dl>

      <section aria-labelledby="by-currency-heading">
        <h2 id="by-currency-heading" className="section__title">
          Assets under management
        </h2>
        <p className="footnote">KES and USD are shown separately; amounts are never converted between currencies.</p>
        <div className="currency-cards">
          {d.byCurrency.map((c) => (
            <article key={c.currency} className="currency-card card" aria-label={`${c.currency} portfolios`}>
              <header className="currency-card__header">
                <span className="badge">{c.currency}</span>
                <span className="currency-card__count">
                  {c.portfolioCount} {c.portfolioCount === 1 ? "portfolio" : "portfolios"}
                </span>
              </header>
              <dl className="currency-card__figures">
                <div>
                  <dt>Market value</dt>
                  <dd className="currency-card__value num">{formatMoney(c.totalValue, c.currency)}</dd>
                </div>
                <div>
                  <dt>Invested</dt>
                  <dd className="num">{formatMoney(c.totalInvested, c.currency)}</dd>
                </div>
                <div>
                  <dt>Unrealised gain / loss</dt>
                  <dd className={cls("num", signClass(c.gain))}>
                    {formatSignedMoney(c.gain, c.currency)} <span>({formatSignedPercent(c.gainPct)})</span>
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {(d.bestPerformer || d.worstPerformer) && (
        <section aria-labelledby="performers-heading">
          <h2 id="performers-heading" className="section__title">
            Performance highlights
          </h2>
          <div className="performers">
            {d.bestPerformer && <Performer label="Best performer" p={d.bestPerformer} />}
            {d.worstPerformer && <Performer label="Weakest performer" p={d.worstPerformer} />}
          </div>
        </section>
      )}

      <div className="dashboard__columns">
        <section className="card dashboard__panel" aria-labelledby="positions-heading">
          <h2 id="positions-heading" className="dashboard__panel-title">
            Largest positions
          </h2>
          <table className="table table--compact">
            <caption className="visually-hidden">Largest positions by market value, per currency</caption>
            <thead>
              <tr>
                <th scope="col">Instrument</th>
                <th scope="col">Portfolio</th>
                <th scope="col" className="num">
                  Market value
                </th>
              </tr>
            </thead>
            <tbody>
              {d.topPositions.map((p) => (
                <tr key={`${p.portfolioId}-${p.instrument}`}>
                  <th scope="row" className="table__instrument">
                    {p.instrument}
                  </th>
                  <td>
                    <Link to={`/portfolios/${p.portfolioId}`}>{p.portfolioName}</Link>
                  </td>
                  <td className="num">{formatMoney(p.totalValue, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card dashboard__panel" aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="dashboard__panel-title">
            Recent activity
          </h2>
          <ul className="activity">
            {d.recentTransactions.map((t) => (
              <li key={t.id} className="activity__item">
                <span className={`type-tag type-tag--${t.type.toLowerCase()}`}>{t.type}</span>
                <span className="activity__text">
                  <strong>
                    {formatNumber(t.quantity)} {t.instrument}
                  </strong>{" "}
                  at {t.currency} {formatNumber(t.unitPrice)}
                  <span className="activity__meta">
                    <Link to={`/portfolios/${t.portfolioId}`}>{t.portfolioName}</Link> · {formatDate(t.tradeDate)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Performer({ label, p }: { label: string; p: PositionRef }) {
  return (
    <Link className="performer card" to={`/portfolios/${p.portfolioId}`}>
      <span className="performer__label">{label}</span>
      <span className="performer__instrument">{p.instrument}</span>
      <span className={cls("performer__pct", "num", signClass(p.gainPct))}>{formatSignedPercent(p.gainPct)}</span>
      <span className="performer__meta">
        {p.portfolioName} · {formatSignedMoney(p.gain, p.currency)}
      </span>
    </Link>
  );
}
