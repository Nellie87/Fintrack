import { Link, useParams } from "react-router";
import { ApiError } from "../api/client";
import { usePortfolio, useSummary } from "../api/queries";
import { HoldingsTable } from "../components/HoldingsTable";
import { EmptyState, ErrorState, LoadingState, QueryView } from "../components/StateViews";
import { SummaryTiles } from "../components/SummaryTiles";
import { formatDate } from "../lib/format";
import { usePageTitle } from "../lib/usePageTitle";

export function PortfolioDetailPage() {
  const id = Number(useParams().id);
  const portfolio = usePortfolio(id);
  const summary = useSummary(id);
  usePageTitle(portfolio.data?.name ?? "Portfolio");

  if (portfolio.isPending) return <LoadingState label="Loading portfolio…" />;
  if (portfolio.isError) {
    if (portfolio.error instanceof ApiError && portfolio.error.status === 404) {
      return (
        <EmptyState
          title="Portfolio not found"
          action={
            <Link className="btn btn--primary" to="/portfolios">
              Back to portfolios
            </Link>
          }
        >
          It may have been deleted, or it belongs to another analyst.
        </EmptyState>
      );
    }
    return <ErrorState error={portfolio.error} onRetry={() => void portfolio.refetch()} />;
  }

  const p = portfolio.data;

  return (
    <>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/portfolios">Portfolios</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{p.name}</span>
      </nav>

      <div className="page-header">
        <div>
          <h1>
            {p.name} <span className="badge">{p.baseCurrency}</span>
          </h1>
          <p className="page-header__sub">
            {p.clientName} · created {formatDate(p.createdAt)}
          </p>
        </div>
      </div>

      <section className="section" aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="section__title">
          Summary
        </h2>
        <QueryView query={summary} loadingLabel="Calculating holdings…">
          {(s) => (
            <>
              <SummaryTiles totals={s.totals} currency={s.currency} holdingsCount={s.holdings.length} />
              <h3 className="section__subtitle">Holdings</h3>
              {s.holdings.length === 0 ? (
                <EmptyState title="No open positions">
                  Record a BUY transaction to start building this portfolio's holdings.
                </EmptyState>
              ) : (
                <HoldingsTable holdings={s.holdings} currency={s.currency} />
              )}
              <p className="footnote">
                Market value uses each instrument's most recent trade price (no live price feed). Average cost is
                weighted by quantity.
              </p>
            </>
          )}
        </QueryView>
      </section>
    </>
  );
}
