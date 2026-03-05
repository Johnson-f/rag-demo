import { useState, useCallback } from 'react';
import { tradeService } from '@/lib/service/trades';
import type { MultiStepAnalysisResponse } from '@/lib/types/trades';

export interface UseMultiStepAgentReturn {
  analyze: (query: string) => Promise<void>;
  response: MultiStepAnalysisResponse | null;
  isLoading: boolean;
  error: string | null;
  clearResponse: () => void;
}

/**
 * Hook for using the multi-step trade analysis agent
 * 
 * This agent uses LangGraph to process queries through multiple steps:
 * 1. Query Classification (symbol/temporal/semantic)
 * 2. Trade Retrieval (based on query type)
 * 3. Analysis Generation (LLM-powered insights)
 */
export function useMultiStepAgent(): UseMultiStepAgentReturn {
  const [response, setResponse] = useState<MultiStepAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (query: string) => {
    if (!query.trim()) {
      setError('Query cannot be empty');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await tradeService.analyzeMultiStep({ query });
      setResponse(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze trades';
      setError(errorMessage);
      console.error('Multi-step analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResponse = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  return {
    analyze,
    response,
    isLoading,
    error,
    clearResponse,
  };
}
