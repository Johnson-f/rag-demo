'use client';

import { useState, useEffect } from 'react';
import { useTradeStream } from '@/lib/hooks/useTradeStream';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Markdown } from '@/components/ui/markdown';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/**
 * Enhanced streaming chat component with markdown rendering and copy functionality
 */
export function Chat() {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [thinking, setThinking] = useState('');
  const [actualResponse, setActualResponse] = useState('');
  
  const { 
    sendMessage, 
    response, 
    isConnected, 
    isStreaming, 
    error,
    clearResponse 
  } = useTradeStream({
    autoConnect: true,
    onError: (err) => console.error('Stream error:', err),
  });

  // Parse response to separate thinking from actual response
  useEffect(() => {
    if (!response) {
      setThinking('');
      setActualResponse('');
      return;
    }

    // Look for common thinking patterns in the response
    // The AI might start with reasoning before the actual formatted response
    const lines = response.split('\n');
    let thinkingEndIndex = -1;
    
    // Detect where thinking ends - look for markdown headers or structured content
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // If we find a markdown header (##) or a clear section start, that's likely the actual response
      if (line.startsWith('##') || line.startsWith('# ') || 
          line.match(/^(Trade-by-trade|Portfolio|Summary|Analysis)/i)) {
        thinkingEndIndex = i;
        break;
      }
    }

    if (thinkingEndIndex > 0) {
      // Found thinking section
      const thinkingText = lines.slice(0, thinkingEndIndex).join('\n').trim();
      const responseText = lines.slice(thinkingEndIndex).join('\n').trim();
      
      // Only set thinking if it's substantial (more than just a sentence)
      if (thinkingText.length > 50) {
        setThinking(thinkingText);
        setActualResponse(responseText);
      } else {
        setThinking('');
        setActualResponse(response);
      }
    } else {
      // No clear thinking section detected
      setThinking('');
      setActualResponse(response);
    }
  }, [response]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && isConnected) {
      sendMessage(message.trim(), 5);
      setMessage('');
    }
  };

  const handleCopy = async () => {
    if (!response) return;
    
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const exampleQuestions = [
    "What's my total profit/loss?",
    "Which stocks performed best?",
    "Show me my losing trades",
    "What patterns do you see?",
    "Analyze my risk management",
    "What's my win rate?",
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">AI Trade Assistant</h3>
            <p className="text-sm text-gray-600">Ask questions about your trading performance</p>
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
            disabled={!isConnected || isStreaming}
            className="flex-1"
          />
          <button
            type="submit"
            disabled={!isConnected || isStreaming || !message.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Thinking...
              </span>
            ) : (
              'Send'
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
                disabled={!isConnected || isStreaming}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {response && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Response
            </h4>
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
          
          {/* Thinking Section - Collapsible */}
          {thinking && (
            <Collapsible open={thinkingOpen} onOpenChange={setThinkingOpen} className="mb-4">
              <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors group">
                <svg 
                  className={`w-4 h-4 text-amber-600 transition-transform ${thinkingOpen ? 'rotate-90' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-sm font-medium text-amber-800">
                  AI Thinking Process
                </span>
                <span className="ml-auto text-xs text-amber-600 group-hover:text-amber-700">
                  {thinkingOpen ? 'Hide' : 'Show'}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                <div className="prose prose-sm max-w-none text-gray-700">
                  <Markdown>{thinking}</Markdown>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          
          <div className="relative">
            <Markdown>{actualResponse || response}</Markdown>
            {isStreaming && (
              <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Streaming response...
              </div>
            )}
          </div>
        </Card>
      )}

      {!response && !isStreaming && (
        <Card className="p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ready to analyze your trades
              </h3>
              <p className="text-sm text-gray-600">
                Ask me anything about your trading performance, patterns, or specific trades.
                I'll provide detailed insights based on your data.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
