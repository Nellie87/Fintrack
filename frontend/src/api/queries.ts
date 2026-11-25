import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Portfolio, PortfolioInput, PortfolioListItem } from "./types";

/** TanStack Query hooks: one per API call, with cache keys kept in one place. */

export const queryKeys = {
  portfolios: ["portfolios"] as const,
  portfolio: (id: number) => ["portfolios", id] as const,
};

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
