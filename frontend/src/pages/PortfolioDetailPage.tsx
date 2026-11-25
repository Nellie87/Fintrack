import { useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "../api/client";
import { useCreateTransaction, usePortfolio, useSummary, useTransactions } from "../api/queries";
import { AllocationChart } from "../components/AllocationChart";
import { ExportCsvButton } from "../components/ExportCsvButton";
import { HoldingsTable } from "../components/HoldingsTable";
import { Modal } from "../components/Modal";
import { TransactionForm } from "../components/TransactionForm";
import { TransactionTable } from "../components/TransactionTable";
import { EmptyState, ErrorState, LoadingState, QueryView } from "../components/StateViews";
import { SummaryTiles } from "../components/SummaryTiles";
import { formatDate, formatNumber } from "../lib/format";
import { useToast } from "../lib/toast-context";
import { usePageTitle } from "../lib/usePageTitle";

export function PortfolioDetailPage() {
  const id = Number(useParams().id);
  const portfolio = usePortfolio(id);
  const summary = useSummary(id);
  const transactions = useTransactions(id);
  const createTransaction = useCreateTransaction(id);
  const [adding, setAdding] = useState(false);
  const toast = useToast();
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
              {s.holdings.length === 0 ? (
                <EmptyState title="No open positions">
                  Record a BUY transaction to start building this portfolio's holdings.
                </EmptyState>
              ) : (
                <>
                  <AllocationChart holdings={s.holdings} currency={s.currency} />
                  <h3 className="section__subtitle">Holdings</h3>
                  <HoldingsTable holdings={s.holdings} currency={s.currency} />
                </>
              )}
              <p className="footnote">
                Market value uses each instrument's most recent trade price (no live price feed). Average cost is
                weighted by quantity.
              </p>
            </>
          )}
        </QueryView>
      </section>

      <section className="section" aria-labelledby="transactions-heading">
        <div className="section__header">
          <h2 id="transactions-heading" className="section__title">
            Transactions
          </h2>
          <div className="section__actions">
            <ExportCsvButton portfolioId={p.id} disabled={!transactions.data?.length} />
            <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
              Add transaction
            </button>
          </div>
        </div>
        <QueryView
          query={transactions}
          loadingLabel="Loading transactions…"
          isEmpty={(list) => list.length === 0}
          empty={
            <EmptyState
              title="No transactions yet"
              action={
                <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
                  Record the first trade
                </button>
              }
            >
              Record this client's first trade, for example a BUY of 1,000 SCOM at {p.baseCurrency} 17.50, and the
              holdings above will update.
            </EmptyState>
          }
        >
          {(list) => <TransactionTable portfolioId={p.id} transactions={list} currency={p.baseCurrency} />}
        </QueryView>
      </section>

      <Modal open={adding} title={`Add transaction · ${p.name}`} onClose={() => setAdding(false)}>
        {adding && (
          <TransactionForm
            currency={p.baseCurrency}
            holdings={summary.data?.holdings ?? []}
            knownInstruments={[...new Set((transactions.data ?? []).map((t) => t.instrument))]}
            onCancel={() => setAdding(false)}
            onSubmit={async (input) => {
              await createTransaction.mutateAsync(input);
              toast.success(`Recorded ${input.type} of ${formatNumber(input.quantity)} ${input.instrument.trim().toUpperCase()}.`);
              setAdding(false);
            }}
          />
        )}
      </Modal>
    </>
  );
}
