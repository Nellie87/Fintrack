import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "../api/client";

/**
 * Loading, empty and error views used by every screen that calls the API.
 * <QueryView> picks the right one for a TanStack Query result, so no screen
 * can forget a state.
 */

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="state state--empty">
      <p className="state__title">{title}</p>
      {children && <p className="state__body">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.message : "Something went wrong while loading this.";
  return (
    <div className="state state--error" role="alert">
      <p className="state__title">We couldn't load this</p>
      <p className="state__body">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--secondary btn--small" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

type QueryViewProps<T> = {
  query: UseQueryResult<T>;
  loadingLabel?: string;
  /** Return true when the data has nothing to show; renders `empty` instead of children. */
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
};

export function QueryView<T>({ query, loadingLabel, isEmpty, empty, children }: QueryViewProps<T>) {
  if (query.isPending) return <LoadingState label={loadingLabel} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (isEmpty?.(query.data) && empty) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
