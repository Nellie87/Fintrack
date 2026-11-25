import { useId, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import type { Currency, Transaction } from "../api/types";
import { useDeleteTransaction } from "../api/queries";
import { formatAmount, formatDate, formatNumber } from "../lib/format";
import { useToast } from "../lib/toast-context";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./StateViews";

type SortKey = "tradeDate" | "instrument" | "type" | "quantity" | "unitPrice" | "total";
type Sort = { key: SortKey; dir: "asc" | "desc" };
type Filters = { instrument: string; type: "" | "BUY" | "SELL"; from: string; to: string };

const NO_FILTERS: Filters = { instrument: "", type: "", from: "", to: "" };
const PAGE_SIZE = 10;

/**
 * Sorting, filtering and paging run in the browser: a portfolio's trade list is small and
 * already loaded. (The API also supports ?page=&pageSize= for larger histories.)
 */
export function TransactionTable({
  portfolioId,
  transactions,
  currency,
}: {
  portfolioId: number;
  transactions: Transaction[];
  currency: Currency;
}) {
  const [sort, setSort] = useState<Sort>({ key: "tradeDate", dir: "desc" });
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const deleteTransaction = useDeleteTransaction(portfolioId);
  const toast = useToast();
  const ids = { instrument: useId(), type: useId(), from: useId(), to: useId() };

  const instruments = useMemo(
    () => [...new Set(transactions.map((t) => t.instrument))].sort(),
    [transactions],
  );

  const rows = useMemo(() => {
    const filtered = transactions.filter(
      (t) =>
        (!filters.instrument || t.instrument === filters.instrument) &&
        (!filters.type || t.type === filters.type) &&
        (!filters.from || t.tradeDate >= filters.from) &&
        (!filters.to || t.tradeDate <= filters.to),
    );
    const factor = sort.dir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      // Ties keep the newest entry first.
      return cmp * factor || b.id - a.id;
    });
  }, [transactions, filters, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount); // stays valid after deletes or filtering
  const firstRow = (currentPage - 1) * PAGE_SIZE;
  const visible = rows.slice(firstRow, firstRow + PAGE_SIZE);

  // Any change to what's shown starts again from page 1.
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const clearFilters = () => {
    setFilters(NO_FILTERS);
    setPage(1);
  };
  const toggleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "tradeDate" ? "desc" : "asc" }));
    setPage(1);
  };

  const closeDelete = () => {
    setDeleting(null);
    deleteTransaction.reset();
  };

  const header = (key: SortKey, label: string, numeric = false) => {
    const active = sort.key === key;
    return (
      <th scope="col" className={numeric ? "num" : undefined} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
        <button type="button" className="sort-button" onClick={() => toggleSort(key)}>
          {label}
          <span className="sort-button__icon" aria-hidden="true">
            {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </button>
      </th>
    );
  };

  return (
    <>
      <div className="filters" role="search" aria-label="Filter transactions">
        <div className="field">
          <label className="field__label" htmlFor={ids.instrument}>Instrument</label>
          <select id={ids.instrument} className="field__input" value={filters.instrument} onChange={(e) => setFilter("instrument", e.target.value)}>
            <option value="">All instruments</option>
            {instruments.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor={ids.type}>Type</label>
          <select id={ids.type} className="field__input" value={filters.type} onChange={(e) => setFilter("type", e.target.value as Filters["type"])}>
            <option value="">Buys and sells</option>
            <option value="BUY">Buys only</option>
            <option value="SELL">Sells only</option>
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor={ids.from}>From</label>
          <input id={ids.from} type="date" className="field__input" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter("from", e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={ids.to}>To</label>
          <input id={ids.to} type="date" className="field__input" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter("to", e.target.value)} />
        </div>
        {isFiltered && (
          <button type="button" className="btn btn--secondary filters__clear" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <p className="table-count" aria-live="polite">
        {rows.length === 0
          ? `No matches among ${transactions.length} transactions`
          : `Showing ${firstRow + 1}–${firstRow + visible.length} of ${rows.length}` +
            (isFiltered ? ` matching (${transactions.length} in total)` : rows.length === 1 ? " transaction" : " transactions")}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          title="No transactions match these filters"
          action={
            <button type="button" className="btn btn--secondary btn--small" onClick={clearFilters}>
              Clear filters
            </button>
          }
        >
          Try another instrument, such as SCOM or KCB, or widen the date range.
        </EmptyState>
      ) : (
        <>
          <div className="table-wrap" tabIndex={0} aria-labelledby="transactions-caption">
            <table className="table">
              <caption id="transactions-caption" className="visually-hidden">
                Transactions, amounts in {currency}. Column headers are buttons that sort the table.
              </caption>
              <thead>
                <tr>
                  {header("tradeDate", "Trade date")}
                  {header("instrument", "Instrument")}
                  {header("type", "Type")}
                  {header("quantity", "Quantity", true)}
                  {header("unitPrice", `Unit price (${currency})`, true)}
                  {header("total", `Total (${currency})`, true)}
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id}>
                    <td className="nowrap">{formatDate(t.tradeDate)}</td>
                    <th scope="row" className="table__instrument">{t.instrument}</th>
                    <td>
                      <span className={`type-tag type-tag--${t.type.toLowerCase()}`}>{t.type}</span>
                    </td>
                    <td className="num">{formatNumber(t.quantity)}</td>
                    <td className="num">{formatNumber(t.unitPrice)}</td>
                    <td className="num">{formatAmount(t.total)}</td>
                    <td className="table__actions">
                      <button type="button" className="btn btn--danger-outline btn--small" onClick={() => setDeleting(t)}>
                        Delete
                        <span className="visually-hidden">
                          {` ${t.type} ${formatNumber(t.quantity)} ${t.instrument} on ${formatDate(t.tradeDate)}`}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-hint">Swipe sideways to see all columns.</p>
          {pageCount > 1 && (
            <nav className="pager" aria-label="Transaction pages">
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              <span className="pager__status" aria-current="page">
                Page {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === pageCount}
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete transaction?"
        confirmLabel="Delete transaction"
        busy={deleteTransaction.isPending}
        error={
          deleteTransaction.error instanceof ApiError
            ? deleteTransaction.error.message
            : deleteTransaction.error
              ? "Couldn't delete. Please try again."
              : null
        }
        onCancel={closeDelete}
        onConfirm={() =>
          deleting &&
          deleteTransaction.mutate(deleting.id, {
            onSuccess: () => {
              toast.success(`Deleted the ${deleting.type} of ${formatNumber(deleting.quantity)} ${deleting.instrument}. Holdings updated.`);
              closeDelete();
            },
          })
        }
      >
        {deleting && (
          <p>
            <strong>
              {deleting.type} {formatNumber(deleting.quantity)} {deleting.instrument}
            </strong>{" "}
            at {currency} {formatNumber(deleting.unitPrice)} on {formatDate(deleting.tradeDate)} will be removed, and the
            holdings recalculated. This can't be undone.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
