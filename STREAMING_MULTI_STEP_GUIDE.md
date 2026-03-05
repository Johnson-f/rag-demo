# Streaming Multi-Step Agent Guide

## Overview

The Streaming Multi-Step Agent provides real-time visibility into the analysis workflow, showing each step as it executes. Users can watch the query classification, trade retrieval, and analysis generation happen in real-time.

## Architecture

### Backend Flow

```
User Query
    ↓
WebSocket Connection (/ws/trades/analyze)
    ↓
StreamingMultiStepAgent.execute_stream()
    ↓
┌─────────────────────────────────────┐
│  Step 1: Classify Query             │
│  Events: StepStart, QueryClassified,│
│          StepComplete                │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Step 2: Retrieve Trades            │
│  Events: StepStart, TradesRetrieving│
│          TradesRetrieved,            │
│          StepComplete                │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Step 3: Generate Analysis          │
│  Events: StepStart,                  │
│          AnalysisGenerating,         │
│          AnalysisComplete,           │
│          StepComplete                │
└─────────────────────────────────────┘
    ↓
Complete Event
```

### Event Types

```rust
pub enum AnalysisEvent {
    StepStart { step, description },
    StepComplete { step, data },
    QueryClassified { query_type, confidence },
    TradesRetrieving { strategy, limit },
    TradesRetrieved { count, trades },
    AnalysisGenerating { model, context_size },
    AnalysisChunk { content },  // For future streaming
    AnalysisComplete { analysis },
    Error { message },
    Complete,
}
```

## Frontend Implementation

### WebSocket Client

Located at: `frontend/src/lib/client/multi-step-websocket.ts`

```typescript
const client = createMultiStepStreamClient({
  onConnect: () => console.log('Connected'),
  onDisconnect: () => console.log('Disconnected'),
  onEvent: (event) => handleEvent(event),
  onError: (error) => console.error(error),
});

client.connect();
client.analyze("Show me my last 5 trades");
```

### Custom Hook

Located at: `frontend/src/lib/hooks/useStreamingMultiStepAgent.ts`

```typescript
const {
  analyze,
  steps,              // Array of workflow steps with status
  currentStep,        // Currently executing step
  queryType,          // Classified query type
  retrievedTrades,    // Retrieved trades
  analysis,           // Generated analysis
  isConnected,        // WebSocket connection status
  isAnalyzing,        // Analysis in progress
  error,              // Error message if any
  clearState,         // Clear all state
} = useStreamingMultiStepAgent();
```

### UI Component

Located at: `frontend/src/components/trades/streaming-multi-step-chat.tsx`

Features:
- Real-time workflow progress visualization
- Step-by-step status indicators (pending/active/complete/error)
- Query type badge display
- Retrieved trades preview
- Markdown-rendered analysis
- Copy and clear functionality

## Running the Application

### 1. Start Backend

```bash
./server.sh
```

Or manually:
```bash
cd backend
RUST_BACKTRACE=full cargo run
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

### 3. Access the Application

Open http://localhost:3000 and navigate to the "⚡ Streaming" tab.

## Usage Examples

### Example 1: Temporal Query

**Input:** "Show me my last 5 trades"

**Real-time Events:**
1. ✓ Step 1: Classify query type → **Temporal Query** 📅
2. ✓ Step 2: Retrieve relevant trades → **Database Query (Chronological)** → 5 trades found
3. ✓ Step 3: Generate analysis → **nvidia/nemotron-3-nano-30b-a3b:free** → Analysis complete

**Output:**
- Query Type: Temporal
- Trades Retrieved: 5
- Analysis: Detailed breakdown with markdown formatting

### Example 2: Symbol Query

**Input:** "Tell me about my AAPL trades"

**Real-time Events:**
1. ✓ Step 1: Classify query type → **Symbol Query** 📊
2. ✓ Step 2: Retrieve relevant trades → **Vector Search (Symbol Match)** → 3 trades found
3. ✓ Step 3: Generate analysis → Analysis complete

**Output:**
- Query Type: Symbol
- Trades Retrieved: 3 (all AAPL trades)
- Analysis: AAPL-specific performance insights

### Example 3: Semantic Query

**Input:** "What patterns do you see in my trading?"

**Real-time Events:**
1. ✓ Step 1: Classify query type → **Semantic Query** 🔍
2. ✓ Step 2: Retrieve relevant trades → **Vector Search (Semantic Similarity)** → 10 trades found
3. ✓ Step 3: Generate analysis → Analysis complete

**Output:**
- Query Type: Semantic
- Trades Retrieved: 10 (most relevant for pattern analysis)
- Analysis: Pattern recognition and trading insights

## Comparison: Three Approaches

| Feature | Simple Streaming | Multi-Step (HTTP) | Streaming Multi-Step (WebSocket) |
|---------|-----------------|-------------------|----------------------------------|
| Real-time Updates | ✅ Text chunks | ❌ Single response | ✅ Step-by-step events |
| Workflow Visibility | ❌ Hidden | ⚠️ After completion | ✅ Real-time |
| Query Classification | ❌ Hidden | ✅ Shown | ✅ Real-time |
| Trade Retrieval | ❌ Hidden | ✅ Shown | ✅ Real-time with strategy |
| Progress Indicators | ⚠️ Basic | ❌ None | ✅ Detailed |
| Connection Type | WebSocket | HTTP | WebSocket |
| Use Case | Quick chat | Detailed analysis | Interactive analysis |
| User Experience | Fast | Complete | Transparent |

## Technical Details

### Backend Components

1. **StreamingMultiStepAgent** (`backend/src/service/ai_service/chat_service/streaming_multi_step_agent.rs`)
   - Executes workflow with event emission
   - Uses tokio channels for async event streaming
   - Spawns background task for processing

2. **MultiStepStreamWs** (`backend/src/service/websocket/multi_step_stream.rs`)
   - WebSocket handler for streaming events
   - Manages connection lifecycle
   - Forwards events to client

3. **WebSocket Route** (`backend/src/routes/websocket.rs`)
   - Endpoint: `/ws/trades/analyze`
   - Handles WebSocket upgrade
   - Spawns handler task

### Frontend Components

1. **WebSocket Client** (`frontend/src/lib/client/multi-step-websocket.ts`)
   - Manages WebSocket connection
   - Handles reconnection logic
   - Parses and dispatches events

2. **Custom Hook** (`frontend/src/lib/hooks/useStreamingMultiStepAgent.ts`)
   - State management for workflow
   - Event handling and state updates
   - Connection lifecycle management

3. **UI Component** (`frontend/src/components/trades/streaming-multi-step-chat.tsx`)
   - Visual workflow representation
   - Real-time status updates
   - Trade preview and analysis display

## Customization

### Adding New Steps

1. **Backend**: Add new event types to `AnalysisEvent`
```rust
pub enum AnalysisEvent {
    // ... existing events
    ValidationStarted { rules: Vec<String> },
    ValidationComplete { passed: bool },
}
```

2. **Backend**: Emit events in workflow
```rust
let _ = tx.send(AnalysisEvent::ValidationStarted {
    rules: vec!["rule1".to_string(), "rule2".to_string()],
}).await;
```

3. **Frontend**: Handle new events in hook
```typescript
case 'validation_started':
  setSteps(prev => [...prev, {
    name: 'validate',
    status: 'active',
    description: 'Validating results',
    timestamp: Date.now(),
  }]);
  break;
```

4. **Frontend**: Update UI to display new step
```typescript
const steps = [
  { name: 'classify', description: 'Classify query type' },
  { name: 'retrieve', description: 'Retrieve relevant trades' },
  { name: 'validate', description: 'Validate results' },  // New step
  { name: 'analyze', description: 'Generate analysis' },
];
```

### Customizing Step Visualization

Edit `frontend/src/components/trades/streaming-multi-step-chat.tsx`:

```typescript
const getStepIcon = (status: string) => {
  switch (status) {
    case 'complete':
      return <CheckIcon className="text-green-500" />;
    case 'active':
      return <SpinnerIcon className="text-blue-500 animate-spin" />;
    case 'error':
      return <ErrorIcon className="text-red-500" />;
    default:
      return <PendingIcon className="text-gray-300" />;
  }
};
```

## Troubleshooting

### Issue: WebSocket not connecting

**Symptoms:** "Disconnected" status, no events received

**Solutions:**
1. Check backend is running: `curl http://localhost:8080/api/health`
2. Verify WebSocket URL in `.env`: `NEXT_PUBLIC_WS_URL=ws://localhost:8080`
3. Check browser console for connection errors
4. Ensure no firewall blocking WebSocket connections

### Issue: Events not displaying

**Symptoms:** Connection successful but no step updates

**Solutions:**
1. Check browser console for event parsing errors
2. Verify event types match between backend and frontend
3. Add logging in `handleEvent` function
4. Check WebSocket message format in Network tab

### Issue: Steps stuck in "active" state

**Symptoms:** Step shows spinning icon indefinitely

**Solutions:**
1. Check backend logs for errors in workflow execution
2. Verify `StepComplete` events are being sent
3. Add timeout handling in frontend
4. Check for exceptions in backend workflow

## Performance Considerations

### Backend

- **Event Frequency**: Limit event emission to avoid overwhelming client
- **Channel Buffer**: Adjust `mpsc::channel(100)` size based on needs
- **Async Spawning**: Workflow runs in background task, doesn't block WebSocket

### Frontend

- **State Updates**: React batches state updates for performance
- **Reconnection**: Exponential backoff prevents connection spam
- **Memory**: Clear state after analysis to prevent memory leaks

## Future Enhancements

### 1. Analysis Streaming

Stream analysis text as it's generated:

```rust
// Backend: Stream LLM output
for chunk in llm_stream {
    let _ = tx.send(AnalysisEvent::AnalysisChunk {
        content: chunk,
    }).await;
}
```

```typescript
// Frontend: Append chunks
case 'analysis_chunk':
  setAnalysis(prev => prev + event.content);
  break;
```

### 2. Progress Percentages

Add progress tracking:

```rust
StepProgress {
    step: String,
    progress: f32,  // 0.0 to 1.0
    message: String,
}
```

### 3. Cancellation

Allow users to cancel in-progress analysis:

```rust
// Backend: Check for cancellation
if cancellation_token.is_cancelled() {
    return Ok(());
}
```

```typescript
// Frontend: Send cancel message
client.cancel();
```

### 4. Step Timing

Track and display execution time per step:

```typescript
interface StreamingStep {
  name: string;
  status: string;
  startTime?: number;
  endTime?: number;
  duration?: number;
}
```

## Conclusion

The Streaming Multi-Step Agent provides the best of both worlds: the transparency of the multi-step approach with the real-time feedback of streaming. Users can see exactly what's happening at each stage, building trust and understanding of the AI analysis process.

For questions or issues, refer to:
- Backend implementation: `backend/src/service/ai_service/chat_service/streaming_multi_step_agent.rs`
- Frontend hook: `frontend/src/lib/hooks/useStreamingMultiStepAgent.ts`
- UI component: `frontend/src/components/trades/streaming-multi-step-chat.tsx`
