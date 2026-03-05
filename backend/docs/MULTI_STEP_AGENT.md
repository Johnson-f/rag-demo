# Multi-Step Trade Analysis Agent

## Overview

The Multi-Step Trade Analysis Agent is a LangGraph-powered stateful agent that processes trade analysis queries through a structured, multi-node workflow. Unlike the simple streaming approach, this agent breaks down the analysis into discrete steps with explicit state management.

## Architecture

### Graph Structure

```
┌─────────────────┐
│  User Query     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Classify Query  │  ← Determines query type (symbol/temporal/semantic)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Retrieve Trades │  ← Fetches relevant trades based on query type
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate        │  ← Generates analysis using LLM
│ Analysis        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Final State    │
└─────────────────┘
```

### State Schema

The agent maintains state across all nodes:

```rust
pub struct TradeAnalysisState {
    pub user_query: String,                    // Original user question
    pub query_type: Option<String>,            // "symbol", "temporal", or "semantic"
    pub retrieved_trades: Vec<TradeDocument>,  // Relevant trades from DB/vector search
    pub analysis: String,                      // Generated analysis text
    pub conversation_history: Vec<Message>,    // For future multi-turn support
}
```

## Node Descriptions

### 1. Classify Query Node

**Purpose**: Determines the type of query to optimize retrieval strategy

**Logic**:
- **Symbol Query**: Detects stock symbol patterns (e.g., "AAPL trades", "my TSLA positions")
- **Temporal Query**: Detects time-based requests (e.g., "last 5 trades", "recent trades")
- **Semantic Query**: Default for meaning-based questions (e.g., "what patterns do you see?")

**Output**: Updates `query_type` in state

### 2. Retrieve Trades Node

**Purpose**: Fetches relevant trades based on the classified query type

**Strategies**:
- **Symbol/Semantic**: Uses vector similarity search via Qdrant
- **Temporal**: Queries database directly, sorted by date

**Output**: Updates `retrieved_trades` in state

### 3. Generate Analysis Node

**Purpose**: Generates insights using the LLM with retrieved context

**Process**:
1. Builds system prompt with trading assistant instructions
2. Formats retrieved trades into context
3. Sends to LLM (nvidia/nemotron-3-nano-30b-a3b:free)
4. Returns markdown-formatted analysis

**Output**: Updates `analysis` in state

## Usage

### Basic Example

```rust
use backend::service::ai_service::chat_service::MultiStepTradeAgent;

// Initialize the agent
let agent = MultiStepTradeAgent::from_env(db).await?;

// Execute a query
let state = agent.execute("Show me my last 5 trades".to_string()).await?;

// Access results
println!("Query Type: {}", state.query_type.unwrap());
println!("Found {} trades", state.retrieved_trades.len());
println!("Analysis: {}", state.analysis);
```

### Integration with Web API

```rust
// In your route handler
async fn analyze_trades(
    query: String,
    agent: web::Data<MultiStepTradeAgent>,
) -> Result<HttpResponse> {
    let state = agent.execute(query).await?;
    
    Ok(HttpResponse::Ok().json(json!({
        "query_type": state.query_type,
        "trades_count": state.retrieved_trades.len(),
        "analysis": state.analysis,
    })))
}
```

## Advantages Over Simple Streaming

### 1. **Explicit State Management**
- Each node has clear inputs and outputs
- State is preserved across the entire workflow
- Easy to inspect intermediate results

### 2. **Modular Design**
- Each node can be tested independently
- Easy to add new nodes (e.g., validation, caching)
- Clear separation of concerns

### 3. **Extensibility**
- Add conditional branching (e.g., route to different analyzers)
- Implement retry logic per node
- Add caching at specific steps
- Support multi-turn conversations with checkpointing

### 4. **Observability**
- Track which node is executing
- Monitor state transitions
- Debug specific steps in isolation

## Future Enhancements

### 1. Conditional Routing

Add branching logic based on query complexity:

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

### 2. Checkpointing for Conversations

Enable persistent conversations:

```rust
use LangGraph::checkpoint::sqlite::SqliteSaver;

let saver = SqliteSaver::new("conversations.db").await?;
let config = LoopConfig::new(CheckpointConfig::new("user_123"));

// Resume conversation
let state = compiled.invoke(Some(&saver), config, input)?;
```

### 3. Parallel Trade Analysis

Analyze multiple aspects simultaneously:

```rust
// Add parallel nodes
graph.add_node("analyze_performance", |input, _ctx| { ... })?;
graph.add_node("analyze_patterns", |input, _ctx| { ... })?;
graph.add_node("analyze_risk", |input, _ctx| { ... })?;

// All execute in parallel after retrieval
graph.add_edge("retrieve_trades", "analyze_performance")?;
graph.add_edge("retrieve_trades", "analyze_patterns")?;
graph.add_edge("retrieve_trades", "analyze_risk")?;

// Aggregate results
graph.add_node("aggregate", |input, _ctx| { ... })?;
graph.add_edge("analyze_performance", "aggregate")?;
graph.add_edge("analyze_patterns", "aggregate")?;
graph.add_edge("analyze_risk", "aggregate")?;
```

### 4. Human-in-the-Loop

Add interrupts for user confirmation:

```rust
use LangGraph::runtime::interrupts::InterruptPolicy;

// Interrupt before executing trades
let policy = InterruptPolicy::before_node("execute_trade");
let config = LoopConfig::new(checkpoint_config).with_interrupt_policy(policy);

// Execute until interrupt
let state = compiled.invoke(Some(&saver), config, input)?;

// User reviews and approves
// Resume execution
let final_state = compiled.invoke(Some(&saver), config, approval_input)?;
```

### 5. Streaming Intermediate Results

Stream node outputs as they complete:

```rust
use LangGraph::runtime::streaming::RuntimeStream;

struct MyStream;
impl RuntimeStream for MyStream {
    fn on_node_start(&self, node: &str) {
        println!("Starting: {}", node);
    }
    
    fn on_node_output(&self, node: &str, output: &Value) {
        println!("Completed: {} -> {:?}", node, output);
    }
}

let stream = MyStream;
let state = compiled.invoke_with_stream(None, config, input, Some(&stream))?;
```

## Performance Considerations

### Memory Usage
- State is cloned between nodes (consider using Arc for large data)
- Trade documents are serialized/deserialized at each step

### Latency
- Sequential execution adds overhead vs. single-shot
- Each node has tokio runtime overhead for async operations
- Consider caching for repeated queries

### Optimization Tips
1. **Cache Classification**: Store query type patterns
2. **Batch Retrieval**: Fetch trades once, reuse across nodes
3. **Lazy Loading**: Only load full trade details when needed
4. **Parallel Nodes**: Use LangGraph's concurrent execution for independent operations

## Testing

### Unit Testing Nodes

```rust
#[tokio::test]
async fn test_classify_query_node() {
    let input = json!({
        "user_query": "Show me AAPL trades",
        "query_type": null,
    });
    
    let result = classify_query_node(input, &ai_client).unwrap();
    let query_type = result.writes.iter()
        .find(|w| w.channel == "query_type")
        .unwrap();
    
    assert_eq!(query_type.value, json!("symbol"));
}
```

### Integration Testing

```rust
#[tokio::test]
async fn test_full_workflow() {
    let agent = MultiStepTradeAgent::from_env(db).await.unwrap();
    let state = agent.execute("Last 5 trades".to_string()).await.unwrap();
    
    assert_eq!(state.query_type, Some("temporal".to_string()));
    assert!(!state.retrieved_trades.is_empty());
    assert!(!state.analysis.is_empty());
}
```

## Comparison with Simple Streaming

| Feature | Simple Streaming | Multi-Step Agent |
|---------|-----------------|------------------|
| State Management | Implicit | Explicit |
| Modularity | Low | High |
| Testability | Difficult | Easy |
| Extensibility | Limited | High |
| Observability | Basic | Detailed |
| Complexity | Low | Medium |
| Performance | Faster | Slightly slower |
| Conversation Memory | No | Yes (with checkpointing) |
| Conditional Logic | Hardcoded | Graph-based |

## Conclusion

The Multi-Step Trade Analysis Agent provides a robust, extensible foundation for complex trade analysis workflows. While it adds some overhead compared to simple streaming, the benefits in maintainability, testability, and extensibility make it ideal for production systems that need to evolve over time.

For simple queries, the streaming approach may be sufficient. For complex, multi-turn conversations with state management, the multi-step agent is the better choice.
