# Multi-Step Agent Frontend Integration

## Overview

The Multi-Step Trade Analysis Agent has been integrated into the frontend, providing a structured, LangGraph-powered analysis experience alongside the existing streaming chat.

## Architecture

### Backend API Endpoint

```
POST /api/trades/analyze
```

**Request:**
```json
{
  "query": "Show me my last 5 trades"
}
```

**Response:**
```json
{
  "query": "Show me my last 5 trades",
  "query_type": "temporal",
  "trades_count": 5,
  "analysis": "# Analysis\n\nHere are your 5 most recent trades...",
  "trades": [
    {
      "trade_id": "uuid",
      "stock_symbol": "AAPL",
      "stock_name": "Apple Inc.",
      "entry_price": 150.00,
      "exit_price": 155.00,
      "trade_type": "long",
      "profit": 5.00,
      "profit_in_percent": 3.33,
      "trade_summary": "Profitable long position",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Frontend Components

### 1. Service Layer (`src/lib/service/trades.ts`)

Added `analyzeMultiStep` method:

```typescript
async analyzeMultiStep(request: MultiStepAnalysisRequest): Promise<MultiStepAnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}/api/trades/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse<MultiStepAnalysisResponse>(response);
}
```

### 2. Custom Hook (`src/lib/hooks/useMultiStepAgent.ts`)

Provides state management for multi-step analysis:

```typescript
const { analyze, response, isLoading, error, clearResponse } = useMultiStepAgent();

// Usage
await analyze("Show me my AAPL trades");
```

**Features:**
- Loading state management
- Error handling
- Response caching
- Clear functionality

### 3. UI Component (`src/components/trades/multi-step-chat.tsx`)

Full-featured chat interface with:

- **Query Input**: Text input with example questions
- **Loading States**: Visual workflow steps during processing
- **Query Type Badge**: Shows classification (symbol/temporal/semantic)
- **Analysis Display**: Markdown-rendered insights
- **Retrieved Trades**: List of trades used for analysis
- **Copy/Clear Actions**: Utility buttons

### 4. Types (`src/lib/types/trades.ts`)

```typescript
export interface MultiStepAnalysisRequest {
  query: string;
}

export interface MultiStepAnalysisResponse {
  query: string;
  query_type: string | null;
  trades_count: number;
  analysis: string;
  trades: TradeDocument[];
}
```

## User Interface

### Tab Navigation

The multi-step agent is accessible via a new tab in the main interface:

```
Trades | Create Trade | Ask Questions | 🤖 Multi-Step Agent
```

### Visual Features

1. **Query Type Badges**
   - 📊 Symbol Query (blue)
   - 📅 Temporal Query (purple)
   - 🔍 Semantic Query (green)

2. **Loading Animation**
   Shows 3-step workflow:
   - Step 1: Classifying query type
   - Step 2: Retrieving relevant trades
   - Step 3: Generating analysis

3. **Metadata Card**
   - Query type badge
   - Number of trades analyzed
   - Copy and clear buttons

4. **Analysis Card**
   - Markdown-formatted insights
   - Syntax highlighting for code
   - Proper heading hierarchy

5. **Retrieved Trades Card**
   - Compact trade summaries
   - Color-coded profit/loss
   - Long/Short badges
   - Entry/Exit prices

## Comparison: Streaming vs Multi-Step

| Feature | Streaming Chat | Multi-Step Agent |
|---------|---------------|------------------|
| Response Type | Real-time streaming | Single response |
| Query Classification | Implicit | Explicit (shown to user) |
| Trade Retrieval | Hidden | Visible (shows trades) |
| Processing Visibility | Minimal | Detailed (3 steps) |
| Use Case | Quick questions | Detailed analysis |
| State Management | WebSocket | HTTP REST |
| Conversation Memory | No | No (future: checkpointing) |

## Usage Examples

### Example 1: Temporal Query

**Input:** "Show me my last 5 trades"

**Output:**
- Query Type: 📅 Temporal Query
- Trades Count: 5
- Analysis: Detailed breakdown of recent trades
- Retrieved Trades: List of 5 most recent trades

### Example 2: Symbol Query

**Input:** "Tell me about my AAPL trades"

**Output:**
- Query Type: 📊 Symbol Query
- Trades Count: 3
- Analysis: AAPL-specific performance analysis
- Retrieved Trades: All AAPL trades

### Example 3: Semantic Query

**Input:** "What patterns do you see in my trading?"

**Output:**
- Query Type: 🔍 Semantic Query
- Trades Count: 10
- Analysis: Pattern recognition and insights
- Retrieved Trades: Relevant trades for pattern analysis

## Development

### Running Locally

1. **Start Backend:**
   ```bash
   cd backend
   cargo run
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080

### Testing the Integration

```typescript
// Test the service directly
import { tradeService } from '@/lib/service/trades';

const response = await tradeService.analyzeMultiStep({
  query: "Show me my last 5 trades"
});

console.log(response.query_type); // "temporal"
console.log(response.trades_count); // 5
console.log(response.analysis); // Markdown analysis
```

### Adding New Features

#### 1. Add Conversation History

Update the backend to support conversation context:

```rust
pub struct TradeAnalysisState {
    pub user_query: String,
    pub query_type: Option<String>,
    pub retrieved_trades: Vec<TradeDocument>,
    pub analysis: String,
    pub conversation_history: Vec<Message>, // Already in state!
}
```

Frontend hook update:

```typescript
const [conversationHistory, setConversationHistory] = useState<Message[]>([]);

const analyze = useCallback(async (query: string) => {
  const result = await tradeService.analyzeMultiStep({ 
    query,
    conversation_history: conversationHistory 
  });
  
  setConversationHistory([
    ...conversationHistory,
    { role: 'user', content: query },
    { role: 'assistant', content: result.analysis }
  ]);
}, [conversationHistory]);
```

#### 2. Add Streaming to Multi-Step

Combine the benefits of both approaches:

```typescript
// Backend: Stream each node's output
for event in graph.stream_events(input, config).await? {
    match event {
        StreamEvent::NodeStart(node) => send_sse(&node.name),
        StreamEvent::NodeOutput(output) => send_sse(&output),
    }
}

// Frontend: Handle SSE
const analyzeWithStreaming = async (query: string) => {
  const eventSource = new EventSource(`/api/trades/analyze-stream?query=${query}`);
  
  eventSource.addEventListener('node_start', (e) => {
    setCurrentStep(e.data);
  });
  
  eventSource.addEventListener('node_output', (e) => {
    updateResponse(JSON.parse(e.data));
  });
};
```

#### 3. Add Checkpointing for Conversations

Enable persistent conversations:

```rust
use LangGraph::checkpoint::sqlite::SqliteSaver;

let saver = SqliteSaver::new("conversations.db").await?;
let config = LoopConfig::new(CheckpointConfig::new(&user_id));

// Resume conversation
let state = compiled.invoke(Some(&saver), config, input)?;
```

## Troubleshooting

### Issue: "Failed to analyze trades"

**Cause:** Backend not running or API endpoint unreachable

**Solution:**
1. Check backend is running: `curl http://localhost:8080/api/health`
2. Check CORS settings in backend
3. Verify API_BASE_URL in frontend `.env`

### Issue: Query type always shows "semantic"

**Cause:** Classification logic not detecting patterns

**Solution:**
1. Check backend classification logic in `classify_query_node`
2. Add more patterns to `is_symbol_query` and `is_temporal_query`
3. Consider using LLM for classification instead of regex

### Issue: No trades retrieved

**Cause:** Vector database empty or query mismatch

**Solution:**
1. Verify trades exist: `curl http://localhost:8080/api/trades`
2. Check Qdrant is running and populated
3. Test vector search directly: `curl http://localhost:8080/api/trades/search?q=test`

## Future Enhancements

### 1. Conditional Routing

Add branching based on query complexity:

```rust
graph.add_conditional_edges(
    "classify_query",
    |state, _result| {
        match state.get("query_type").and_then(|v| v.as_str()) {
            Some("complex") => Ok(vec![BranchTarget::Node("deep_analysis".to_string())]),
            _ => Ok(vec![BranchTarget::Node("retrieve_trades".to_string())]),
        }
    },
    None,
)?;
```

### 2. Parallel Analysis

Analyze multiple aspects simultaneously:

```rust
// Add parallel nodes
graph.add_node("analyze_performance", |input, _ctx| { ... })?;
graph.add_node("analyze_patterns", |input, _ctx| { ... })?;
graph.add_node("analyze_risk", |input, _ctx| { ... })?;

// All execute in parallel
graph.add_edge("retrieve_trades", "analyze_performance")?;
graph.add_edge("retrieve_trades", "analyze_patterns")?;
graph.add_edge("retrieve_trades", "analyze_risk")?;
```

### 3. Human-in-the-Loop

Add approval steps for actions:

```rust
use LangGraph::runtime::interrupts::InterruptPolicy;

let policy = InterruptPolicy::before_node("execute_trade");
let config = LoopConfig::new(checkpoint_config).with_interrupt_policy(policy);
```

Frontend:

```typescript
const { analyze, response, needsApproval, approve, reject } = useMultiStepAgent();

if (needsApproval) {
  return (
    <div>
      <p>Agent wants to execute trade. Approve?</p>
      <button onClick={approve}>Approve</button>
      <button onClick={reject}>Reject</button>
    </div>
  );
}
```

## Performance Considerations

### Backend

- **Caching**: Cache classification results for similar queries
- **Batch Processing**: Retrieve trades in batches
- **Connection Pooling**: Reuse database connections

### Frontend

- **Debouncing**: Debounce query input to avoid excessive requests
- **Response Caching**: Cache responses for identical queries
- **Lazy Loading**: Load trade details on demand

## Conclusion

The Multi-Step Agent integration provides a powerful, transparent analysis experience that complements the existing streaming chat. Users can now see exactly how their queries are processed and what data is used for analysis, leading to more trust and better insights.

For questions or issues, refer to:
- Backend docs: `backend/docs/MULTI_STEP_AGENT.md`
- LangGraph crate: `backend/src/crates/README.md`
