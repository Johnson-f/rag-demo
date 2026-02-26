// Trade types and interfaces

export type TradeType = 'long' | 'short';

export interface CreateTradeInput {
  stock_symbol: string;
  stock_name: string;
  entry_price: number;
  exit_price: number;
  trade_type: TradeType;
  stop_loss?: number;
  initial_target?: number;
  notes?: string;
}

export interface Trade {
  id?: number;
  trade_id: string;
  stock_symbol: string;
  stock_name: string;
  entry_price: number;
  exit_price: number;
  trade_type: TradeType;
  stop_loss?: number;
  risk_reward?: number;
  profit?: number;
  profit_in_percent?: number;
  initial_target?: number;
  notes?: string;
  trade_summary?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TradeDocument {
  trade_id: string;
  stock_symbol: string;
  stock_name: string;
  entry_price: number;
  exit_price: number;
  trade_type: string;
  stop_loss?: number;
  risk_reward?: number;
  profit?: number;
  profit_in_percent?: number;
  initial_target?: number;
  notes?: string;
  trade_summary: string;
  created_at: string;
}

export interface SearchQuery {
  q: string;
  limit?: number;
}

export interface InsightsRequest {
  question: string;
}

export interface InsightsResponse {
  question: string;
  insights: string;
}

export interface ErrorResponse {
  error: string;
}
