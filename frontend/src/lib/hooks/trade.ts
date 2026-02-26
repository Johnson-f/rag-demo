// TanStack Query hooks for trade operations

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tradeService } from '@/lib/service/trades';
import type {
  CreateTradeInput,
  SearchQuery,
  InsightsRequest,
} from '@/lib/types/trades';

// Query keys
export const tradeKeys = {
  all: ['trades'] as const,
  lists: () => [...tradeKeys.all, 'list'] as const,
  list: () => [...tradeKeys.lists()] as const,
  details: () => [...tradeKeys.all, 'detail'] as const,
  detail: (id: string) => [...tradeKeys.details(), id] as const,
  symbols: () => [...tradeKeys.all, 'symbol'] as const,
  symbol: (symbol: string) => [...tradeKeys.symbols(), symbol] as const,
  search: (query: string) => [...tradeKeys.all, 'search', query] as const,
};

// Query hooks
export function useTrades() {
  return useQuery({
    queryKey: tradeKeys.list(),
    queryFn: () => tradeService.getAll(),
  });
}

export function useTrade(tradeId: string) {
  return useQuery({
    queryKey: tradeKeys.detail(tradeId),
    queryFn: () => tradeService.getById(tradeId),
    enabled: !!tradeId,
  });
}

export function useTradesBySymbol(symbol: string) {
  return useQuery({
    queryKey: tradeKeys.symbol(symbol),
    queryFn: () => tradeService.getBySymbol(symbol),
    enabled: !!symbol,
  });
}

export function useTradeSearch(query: SearchQuery) {
  return useQuery({
    queryKey: tradeKeys.search(query.q),
    queryFn: () => tradeService.search(query),
    enabled: !!query.q,
  });
}

// Mutation hooks
export function useCreateTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTradeInput) => tradeService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tradeKeys.lists() });
    },
  });
}

export function useUpdateTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tradeId, input }: { tradeId: string; input: CreateTradeInput }) =>
      tradeService.update(tradeId, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tradeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: tradeKeys.detail(data.trade_id) });
      if (data.stock_symbol) {
        queryClient.invalidateQueries({ queryKey: tradeKeys.symbol(data.stock_symbol) });
      }
    },
  });
}

export function useDeleteTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tradeId: string) => tradeService.delete(tradeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tradeKeys.lists() });
    },
  });
}

export function useTradeInsights() {
  return useMutation({
    mutationFn: (request: InsightsRequest) => tradeService.getInsights(request),
  });
}
