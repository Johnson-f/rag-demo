// Trade service for HTTP communication with backend

import { API_BASE_URL, handleResponse } from '@/lib/client/api';
import type {
  CreateTradeInput,
  Trade,
  TradeDocument,
  SearchQuery,
  InsightsRequest,
  InsightsResponse,
  MultiStepAnalysisRequest,
  MultiStepAnalysisResponse,
} from '@/lib/types/trades';

// Trade service functions
export const tradeService = {
  /**
   * Create a new trade
   */
  async create(input: CreateTradeInput): Promise<Trade> {
    const response = await fetch(`${API_BASE_URL}/api/trades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    return handleResponse<Trade>(response);
  },

  /**
   * Get all trades
   */
  async getAll(): Promise<Trade[]> {
    const response = await fetch(`${API_BASE_URL}/api/trades`);
    return handleResponse<Trade[]>(response);
  },

  /**
   * Get a specific trade by trade_id (UUID)
   */
  async getById(tradeId: string): Promise<Trade> {
    const response = await fetch(`${API_BASE_URL}/api/trades/${tradeId}`);
    return handleResponse<Trade>(response);
  },

  /**
   * Get trades by stock symbol
   */
  async getBySymbol(symbol: string): Promise<Trade[]> {
    const response = await fetch(`${API_BASE_URL}/api/trades/symbol/${symbol}`);
    return handleResponse<Trade[]>(response);
  },

  /**
   * Update a trade
   */
  async update(tradeId: string, input: CreateTradeInput): Promise<Trade> {
    const response = await fetch(`${API_BASE_URL}/api/trades/${tradeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    return handleResponse<Trade>(response);
  },

  /**
   * Delete a trade
   */
  async delete(tradeId: string): Promise<{ message: string; trade_id?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/trades/${tradeId}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string; trade_id?: string }>(response);
  },

  /**
   * Semantic search for similar trades
   */
  async search(query: SearchQuery): Promise<TradeDocument[]> {
    const params = new URLSearchParams({
      q: query.q,
      ...(query.limit && { limit: query.limit.toString() }),
    });
    const response = await fetch(`${API_BASE_URL}/api/trades/search?${params}`);
    return handleResponse<TradeDocument[]>(response);
  },

  /**
   * Get AI insights about trades
   */
  async getInsights(request: InsightsRequest): Promise<InsightsResponse> {
    const response = await fetch(`${API_BASE_URL}/api/trades/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return handleResponse<InsightsResponse>(response);
  },

  /**
   * Analyze trades using multi-step agent (LangGraph-powered)
   * This provides structured analysis with query classification and contextual retrieval
   */
  async analyzeMultiStep(request: MultiStepAnalysisRequest): Promise<MultiStepAnalysisResponse> {
    const response = await fetch(`${API_BASE_URL}/api/trades/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return handleResponse<MultiStepAnalysisResponse>(response);
  },
};
