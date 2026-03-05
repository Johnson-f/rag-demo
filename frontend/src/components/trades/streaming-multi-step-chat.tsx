'use client';

import { useState } from 'react';
import { useStreamingMultiStepAgent } from '@/lib/hooks/useStreamingMultiStepAgent';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Markdown } from '@/components/ui/markdown';
import { Badge } from '@/components/ui/badge';

/**
 * Streaming multi-step agent chat component
 * Shows real-time progress for each step of the analysis workflow
 */
export function StreamingMultiStepChat() {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  
  const { 
    analyze,
    steps,
    currentStep,
    queryType,
    retrievedTrades,
    analysis,
    isConnected,
    isAnalyzing,
    error,
    clearState,
  } = useStreamingMultiStepAgent({
    autoConnect: true,
    onError: (err) => console.error('Stream error:', err),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && isConnected && !isAnalyzing) {
      analyze(message.trim());
      setMessage('');
    }
  };

  const handleCopy = async () => {
    if (!analysis) return;
    
    try {
      await navigator.clipboard.writeText(analysis);
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

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'active':
        return (
          <svg className="w-5 h-5 text-blue-500 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
        );
    }
  };

  const getQueryTypeBadge = (type: string | null) => {
    if (!type) return null;
    
    const variants: Record<string, { color: string; icon: string }> = {
      symbol: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '📊' },
      temporal: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '📅' },
      semantic: { color: 'bg-green-100 text-green-800 border-green-200', icon: '🔍' },
    };

    const variant = variants[type] || variants.semantic;

    return (
      <Badge className={`${variant.color} border`}>
        <span className="mr-1">{variant.icon}</span>
        {type.charAt(0).toUpperCase() + type.slice(1)} Query
      </Badge>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Streaming Multi-Step Agent
            </h3>
            <p className="text-sm text-gray-600">
              Real-time workflow visualization • See every step as it happens
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
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
            disabled={!isConnected || isAnalyzing}
            className="flex-1"
          />
          <button
            type="submit"
            disabled={!isConnected || isAnalyzing || !message.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>

        <div>
          <p className="text-xs text-gray-600 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQuestions.map((q) => (
              <button
                key={q}
                onClick={() => setMessage(q)}
                disabled={!isConnected || isAnalyzing}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Workflow Steps */}
      {(isAnalyzing || steps.some(s => s.status !== 'pending')) && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h4 className="text-sm font-semibold text-gray-700">Workflow Progress</h4>
            {queryType && getQueryTypeBadge(queryType)}
          </div>
          
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={step.name}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  step.status === 'active' 
                    ? 'bg-blue-50 border-blue-200' 
                    : step.status === 'complete'
                    ? 'bg-green-50 border-green-200'
                    : step.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      Step {idx + 1}: {step.description}
                    </span>
                  </div>
                  {step.status === 'active' && (
                    <p className="text-xs text-gray-600 mt-1">Processing...</p>
                  )}
                  {step.status === 'complete' && step.data && (
                    <p className="text-xs text-gray-600 mt-1">
                      {JSON.stringify(step.data)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Retrieved Trades */}
      {retrievedTrades.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h4 className="text-sm font-semibold text-gray-700">
              Retrieved Trades ({retrievedTrades.length})
            </h4>
          </div>
          <div className="space-y-2">
            {retrievedTrades.map((trade, idx) => (
              <div
                key={trade.trade_id || idx}
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
                        {trade.trade_type?.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600">
                      Entry: ${trade.entry_price?.toFixed(2)} → Exit: ${trade.exit_price?.toFixed(2)}
                      {trade.profit !== undefined && (
                        <span className={trade.profit >= 0 ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                          ${trade.profit.toFixed(2)} ({trade.profit_in_percent?.toFixed(2)}%)
                        </span>
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

      {/* Analysis */}
      {analysis && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h4 className="text-sm font-semibold text-gray-700">Analysis</h4>
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
                onClick={clearState}
                className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none">
            <Markdown>{analysis}</Markdown>
          </div>
        </Card>
      )}

      {!isAnalyzing && !analysis && (
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">⚡</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Streaming Analysis Ready
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Watch the analysis workflow in real-time as each step completes
              </p>
              <div className="text-left space-y-2 max-w-sm mx-auto">
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 font-semibold">⚡</span>
                  <span>See query classification as it happens</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 font-semibold">⚡</span>
                  <span>Watch trades being retrieved in real-time</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 font-semibold">⚡</span>
                  <span>View analysis generation progress</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
