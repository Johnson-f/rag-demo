import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  createMultiStepStreamClient, 
  MultiStepStreamClient,
  AnalysisEvent 
} from '../client/multi-step-websocket';

export interface StreamingStep {
  name: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  description?: string;
  data?: any;
  timestamp: number;
}

export interface UseStreamingMultiStepAgentOptions {
  autoConnect?: boolean;
  onError?: (error: string) => void;
}

export interface UseStreamingMultiStepAgentReturn {
  analyze: (query: string) => void;
  steps: StreamingStep[];
  currentStep: string | null;
  queryType: string | null;
  retrievedTrades: any[];
  analysis: string;
  isConnected: boolean;
  isAnalyzing: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  clearState: () => void;
}

export function useStreamingMultiStepAgent(
  options: UseStreamingMultiStepAgentOptions = {}
): UseStreamingMultiStepAgentReturn {
  const { autoConnect = true, onError } = options;
  
  const [steps, setSteps] = useState<StreamingStep[]>([
    { name: 'classify', status: 'pending', description: 'Classify query type', timestamp: Date.now() },
    { name: 'retrieve', status: 'pending', description: 'Retrieve relevant trades', timestamp: Date.now() },
    { name: 'analyze', status: 'pending', description: 'Generate analysis', timestamp: Date.now() },
  ]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [queryType, setQueryType] = useState<string | null>(null);
  const [retrievedTrades, setRetrievedTrades] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const clientRef = useRef<MultiStepStreamClient | null>(null);

  const updateStepStatus = useCallback((stepName: string, status: StreamingStep['status'], data?: any) => {
    setSteps(prev => prev.map(step => 
      step.name === stepName 
        ? { ...step, status, data, timestamp: Date.now() }
        : step
    ));
  }, []);

  const handleEvent = useCallback((event: AnalysisEvent) => {
    console.log('Analysis event:', event);

    switch (event.type) {
      case 'step_start':
        if (event.step) {
          setCurrentStep(event.step);
          updateStepStatus(event.step, 'active');
        }
        break;

      case 'step_complete':
        if (event.step) {
          updateStepStatus(event.step, 'complete', event.data);
          setCurrentStep(null);
        }
        break;

      case 'query_classified':
        setQueryType(event.query_type || null);
        break;

      case 'trades_retrieving':
        // Update retrieve step with strategy info
        setSteps(prev => prev.map(step => 
          step.name === 'retrieve'
            ? { ...step, description: `Retrieving trades using ${event.strategy}` }
            : step
        ));
        break;

      case 'trades_retrieved':
        setRetrievedTrades(event.trades || []);
        break;

      case 'analysis_generating':
        setSteps(prev => prev.map(step => 
          step.name === 'analyze'
            ? { ...step, description: `Generating analysis with ${event.model}` }
            : step
        ));
        break;

      case 'analysis_chunk':
        if (event.content) {
          setAnalysis(prev => prev + event.content);
        }
        break;

      case 'analysis_complete':
        if (event.analysis) {
          setAnalysis(event.analysis);
        }
        break;

      case 'error':
        setError(event.message || 'An error occurred');
        setIsAnalyzing(false);
        if (currentStep) {
          updateStepStatus(currentStep, 'error');
        }
        onError?.(event.message || 'An error occurred');
        break;

      case 'complete':
        setIsAnalyzing(false);
        setCurrentStep(null);
        break;
    }
  }, [currentStep, updateStepStatus, onError]);

  const connect = useCallback(() => {
    if (clientRef.current?.isConnected()) {
      return;
    }

    const client = createMultiStepStreamClient({
      onConnect: () => {
        setIsConnected(true);
        setError(null);
      },
      onDisconnect: () => {
        setIsConnected(false);
        setIsAnalyzing(false);
      },
      onEvent: handleEvent,
      onError: (err) => {
        setError(err);
        setIsAnalyzing(false);
        onError?.(err);
      },
    });

    client.connect();
    clientRef.current = client;
  }, [handleEvent, onError]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setIsConnected(false);
    setIsAnalyzing(false);
  }, []);

  const analyze = useCallback((query: string) => {
    if (!clientRef.current?.isConnected()) {
      setError('Not connected to server');
      return;
    }

    // Reset state
    setSteps([
      { name: 'classify', status: 'pending', description: 'Classify query type', timestamp: Date.now() },
      { name: 'retrieve', status: 'pending', description: 'Retrieve relevant trades', timestamp: Date.now() },
      { name: 'analyze', status: 'pending', description: 'Generate analysis', timestamp: Date.now() },
    ]);
    setCurrentStep(null);
    setQueryType(null);
    setRetrievedTrades([]);
    setAnalysis('');
    setError(null);
    setIsAnalyzing(true);

    clientRef.current.analyze(query);
  }, []);

  const clearState = useCallback(() => {
    setSteps([
      { name: 'classify', status: 'pending', description: 'Classify query type', timestamp: Date.now() },
      { name: 'retrieve', status: 'pending', description: 'Retrieve relevant trades', timestamp: Date.now() },
      { name: 'analyze', status: 'pending', description: 'Generate analysis', timestamp: Date.now() },
    ]);
    setCurrentStep(null);
    setQueryType(null);
    setRetrievedTrades([]);
    setAnalysis('');
    setError(null);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    analyze,
    steps,
    currentStep,
    queryType,
    retrievedTrades,
    analysis,
    isConnected,
    isAnalyzing,
    error,
    connect,
    disconnect,
    clearState,
  };
}
