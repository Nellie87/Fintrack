import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Portfolio,
  PortfolioInput,
  PortfolioListItem,
  Summary,
  Transaction,
  TransactionInput,
} from "./types";

/** TanStack Query hooks: one per API call, with cache keys kept in one place. */

export const queryKeys = {
  portfolios: ["portfolios"] as const,
  portfolio: (id: number) => ["portfolios", id] as const,
  summary: (id: number) => ["portfolios", id, "summary"] as const,
  transactions: (id: number) => ["portfolios", id, "transactions"] as const,
};

export function useTransactions(portfolioId: number) {
  return useQuery({
    queryKey: queryKeys.transactions(portfolioId),
    queryFn: () => api<Transaction[]>(`/api/portfolios/${portfolioId}/transactions`),
  });
}

/** After a trade is added or removed, holdings, the trade list and the list page's counts all change. */
function invalidatePortfolioData(qc: ReturnType<typeof useQueryClient>, portfolioId: number) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.transactions(portfolioId) }),
    qc.invalidateQueries({ queryKey: queryKeys.summary(portfolioId) }),
    qc.invalidateQueries({ queryKey: queryKeys.portfolios, exact: true }),
  ]);
}

export function useCreateTransaction(portfolioId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput) =>
      api<Transaction>(`/api/portfolios/${portfolioId}/transactions`, { method: "POST", body: input }),
    onSuccess: () => invalidatePortfolioData(qc, portfolioId),
  });
}

export function useDeleteTransaction(portfolioId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: number) => api<void>(`/api/transactions/${transactionId}`, { method: "DELETE" }),
    onSuccess: () => invalidatePortfolioData(qc, portfolioId),
  });
}

export function useSummary(id: number) {
  return useQuery({
    queryKey: queryKeys.summary(id),
    queryFn: () => api<Summary>(`/api/portfolios/${id}/summary`),
  });
}

export function usePortfolios() {
  return useQuery({
    queryKey: queryKeys.portfolios,
    queryFn: () => api<PortfolioListItem[]>("/api/portfolios"),
  });
}

export function usePortfolio(id: number) {
  return useQuery({
    queryKey: queryKeys.portfolio(id),
    queryFn: () => api<Portfolio>(`/api/portfolios/${id}`),
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PortfolioInput) => api<Portfolio>("/api/portfolios", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.portfolios }),
  });
}

export function useUpdatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: PortfolioInput }) =>
      api<Portfolio>(`/api/portfolios/${id}`, { method: "PUT", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.portfolios }),
  });
}

export function useDeletePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/api/portfolios/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: queryKeys.portfolio(id) });
      return qc.invalidateQueries({ queryKey: queryKeys.portfolios });
    },
  });
}
