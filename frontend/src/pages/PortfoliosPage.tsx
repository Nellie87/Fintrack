import { useState } from "react";
import { Link } from "react-router";
import { ApiError } from "../api/client";
import { useCreatePortfolio, useDeletePortfolio, usePortfolios, useUpdatePortfolio } from "../api/queries";
import type { PortfolioListItem } from "../api/types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { PortfolioForm } from "../components/PortfolioForm";
import { EmptyState, QueryView } from "../components/StateViews";
import { formatDate } from "../lib/format";
import { usePageTitle } from "../lib/usePageTitle";
import { useToast } from "../lib/toast-context";

type Editing = { mode: "create" } | { mode: "edit"; portfolio: PortfolioListItem } | null;

export function PortfoliosPage() {
  usePageTitle("Portfolios");
  const portfolios = usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const updatePortfolio = useUpdatePortfolio();
  const deletePortfolio = useDeletePortfolio();
  const toast = useToast();

  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<PortfolioListItem | null>(null);
  const [search, setSearch] = useState("");

  const openCreate = () => setEditing({ mode: "create" });
  const closeDelete = () => {
    setDeleting(null);
    deletePortfolio.reset();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Portfolios</h1>
          <p className="page-header__sub">Client portfolios you manage.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          New portfolio
        </button>
      </div>

      <QueryView
        query={portfolios}
        loadingLabel="Loading portfoliosâ¦"
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            title="No portfolios yet"
            action={
              <button type="button" className="btn btn--primary" onClick={openCreate}>
                Create your first portfolio
              </button>
            }
          >
            Create one for your first client, then record their buys and sells to see holdings and performance.
          </EmptyState>
        }
      >
        {(list) => {
          const q = search.trim().toLowerCase();
          const matches = q
            ? list.filter((p) => [p.name, p.clientName, p.baseCurrency].some((v) => v.toLowerCase().includes(q)))
            : list;
          return (
            <>
              <div className="search" role="search">
                <label htmlFor="portfolio-search" className="visually-hidden">
                  Search portfolios
                </label>
                <span className="search__icon" aria-hidden="true">
                  ⌕
                </span>
                <input
                  id="portfolio-search"
                  type="search"
                  className="field__input search__input"
                  placeholder="Search by portfolio, client or currency, e.g. Acacia"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <p className="table-count" aria-live="polite">
                {q
                  ? `${matches.length} of ${list.length} portfolios match “${search.trim()}”`
                  : `${list.length} ${list.length === 1 ? "portfolio" : "portfolios"}`}
              </p>
              {matches.length === 0 ? (
                <EmptyState
                  title={`No portfolios match “${search.trim()}”`}
                  action={
                    <button type="button" className="btn btn--secondary btn--small" onClick={() => setSearch("")}>
                      Clear search
                    </button>
                  }
                >
                  Try a client name such as Baobab, or a portfolio name such as Growth.
                </EmptyState>
              ) : (
                <ul className="portfolio-grid">
                  {matches.map((p) => (
                    <li key={p.id} className="portfolio-card card">
                      <div className="portfolio-card__top">
                        <h2 className="portfolio-card__name">
                          <Link to={`/portfolios/${p.id}`}>{p.name}</Link>
                        </h2>
                        <span className="badge">{p.baseCurrency}</span>
                      </div>
                      <p className="portfolio-card__client">{p.clientName}</p>
                      <dl className="portfolio-card__meta">
                        <div>
                          <dt>Transactions</dt>
                          <dd className="num">{p.transactionCount}</dd>
                        </div>
                        <div>
                          <dt>Created</dt>
                          <dd>{formatDate(p.createdAt)}</dd>
                        </div>
                      </dl>
                      <div className="portfolio-card__actions">
                        <Link className="btn btn--primary btn--small" to={`/portfolios/${p.id}`}>
                          Open<span className="visually-hidden"> {p.name}</span>
                        </Link>
                        <button
                          type="button"
                          className="btn btn--secondary btn--small"
                          onClick={() => setEditing({ mode: "edit", portfolio: p })}
                        >
                          Edit<span className="visually-hidden"> {p.name}</span>
                        </button>
                        <button type="button" className="btn btn--danger-outline btn--small" onClick={() => setDeleting(p)}>
                          Delete<span className="visually-hidden"> {p.name}</span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          );
        }}
      </QueryView>

      <Modal
        open={editing !== null}
        title={editing?.mode === "edit" ? "Edit portfolio" : "New portfolio"}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <PortfolioForm
            key={editing.mode === "edit" ? editing.portfolio.id : "new"}
            initial={
              editing.mode === "edit"
                ? {
                    name: editing.portfolio.name,
                    clientName: editing.portfolio.clientName,
                    baseCurrency: editing.portfolio.baseCurrency,
                  }
                : undefined
            }
            submitLabel={editing.mode === "edit" ? "Save changes" : "Create portfolio"}
            onCancel={() => setEditing(null)}
            onSubmit={async (input) => {
              if (editing.mode === "edit") {
                await updatePortfolio.mutateAsync({ id: editing.portfolio.id, input });
                toast.success(`Saved changes to “${input.name}”.`);
              } else {
                await createPortfolio.mutateAsync(input);
                toast.success(`Created “${input.name}” for ${input.clientName}.`);
              }
              setEditing(null);
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete portfolio?"
        confirmLabel="Delete portfolio"
        busy={deletePortfolio.isPending}
        error={deletePortfolio.error instanceof ApiError ? deletePortfolio.error.message : deletePortfolio.error ? "Couldn't delete. Please try again." : null}
        onCancel={closeDelete}
        onConfirm={() =>
          deleting &&
          deletePortfolio.mutate(deleting.id, {
            onSuccess: () => {
              toast.success(`Deleted “${deleting.name}”.`);
              closeDelete();
            },
          })
        }
      >
        {deleting && (
          <p>
            <strong>{deleting.name}</strong> ({deleting.clientName}) and its{" "}
            {deleting.transactionCount === 1 ? "1 transaction" : `${deleting.transactionCount} transactions`} will be
            permanently deleted. This can't be undone.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
