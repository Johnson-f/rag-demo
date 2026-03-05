'use client';

import { useState } from 'react';
import { useMultiStepAgent } from '@/lib/hooks/useMultiStepAgent';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Markdown } from '@/components/ui/markdown';
import { Badge } from '@/components/ui/badge';

/**
 * Multi-step agent chat component using LangGraph
 * 
 * Features:
 * - Query classification (symbol/temporal/semantic)
 * - Structured trade retrieval
 * - Detailed analysis with context
 * - Shows retrieved trades
 */
export function MultiStepChat() {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  
  const { 
    analyze, 
    response, 
    isLoading, 
    error,
    clearResponse 
  } = useMultiStepAgent();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      analyze(message.trim());
      setMessage('');
    }
  };

  const handleCopy = async () => {
    if (!response?.analysis) return;
    
    try {
      await navigator.clipboard.writeText(response.analysis);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const exampleQuestions = [
    "Show me my last 5 trades",
    "Tell me about my AAPL trades",
    "What patterns do you see?",
    "Analyze my risk management",
    "What's my win rate?",
    "Show me my most profitable trades",
  ];

  const getQueryTypeBadge = (queryType: string | null) => {
    if (!queryType) return null;
    
    const variants: Record<string, { color: string; icon: string }> = {
      symbol: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '📊' },
      temporal: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '📅' },
      semantic: { color: 'bg-green-100 text-green-800 border-green-200', icon: '🔍' },
    };

    const variant = variants[queryType] || variants.semantic;

    return (
      <Badge className={`${variant.color} border`}>
        <span className="mr-1">{variant.icon}</span>
        {queryType.charAt(0).toUpperCase() + queryType.slice(1)} Query
      </Badge>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              Multi-Step AI Agent
            </h3>
            <p className="text-sm text-gray-600">
              Powered by LangGraph • Structured analysis with query classification
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about your trades..."
            disabled={isLoading}
            className="flex-1"
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
              </span>
            ) : (
              'Analyze'
            )}
          </button>
        </form>

        <div>
          <p className="text-xs text-gray-600 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQuestions.map((q) => (
              <button
                key={q}
                onClick={() => setMessage(q)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {isLoading && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Processing your query...</h4>
                <p className="text-xs text-gray-600">Running multi-step analysis workflow</p>
              </div>
            </div>
            <div className="space-y-2 pl-11">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Step 1: Classifying query type
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Step 2: Retrieving relevant trades
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Step 3: Generating analysis
              </div>
            </div>
          </div>
        </Card>
      )}

      {response && (
        <div className="space-y-4">
          {/* Metadata Card */}
          <Card className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {getQueryTypeBadge(response.query_type)}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium">{response.trades_count}</span> trades analyzed
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={clearResponse}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </Card>

          {/* Analysis Card */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h4 className="text-sm font-semibold text-gray-700">Analysis</h4>
            </div>
            <div className="prose prose-sm max-w-none">
              <Markdown>{response.analysis}</Markdown>
            </div>
          </Card>

          {/* Retrieved Trades Card */}
          {response.trades.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-700">
                  Retrieved Trades ({response.trades.length})
                </h4>
              </div>
              <div className="space-y-3">
                {response.trades.map((trade, idx) => (
                  <div
                    key={trade.trade_id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">
                            {trade.stock_symbol}
                          </span>
                          <span className="text-xs text-gray-600">
                            {trade.stock_name}
                          </span>
                          <Badge className={`text-xs ${
                            trade.trade_type === 'long' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.trade_type.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>
                            Entry: ${trade.entry_price.toFixed(2)} → Exit: ${trade.exit_price.toFixed(2)}
                          </div>
                          {trade.profit !== undefined && (
                            <div className={trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                              Profit: ${trade.profit.toFixed(2)} ({trade.profit_in_percent?.toFixed(2)}%)
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        #{idx + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {!response && !isLoading && (
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">🤖</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Multi-Step Analysis Ready
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                This agent uses a structured workflow to analyze your trades:
              </p>
              <div className="text-left space-y-2 max-w-sm mx-auto">
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 font-semibold">1.</span>
                  <span><strong>Classify</strong> your query type (symbol/temporal/semantic)</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 font-semibold">2.</span>
                  <span><strong>Retrieve</strong> relevant trades using optimal strategy</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 font-semibold">3.</span>
                  <span><strong>Generate</strong> detailed insights with context</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
