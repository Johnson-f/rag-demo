# Chat Context Fix: Temporal Query Detection

## Problem

When users asked questions like "my last 5 trades" or "show me recent trades", the AI would respond saying it had no access to trade data, even though trades existed in the database.

## Root Cause

The chat service was using **semantic search** exclusively via the vector database (Qdrant). When a user asks "my last 5 trades":

1. The query is converted to an embedding
2. Vector similarity search finds trades semantically similar to the query
3. If no trades match semantically (which is common for temporal queries), empty context is returned
4. AI responds: "I don't have access to your trade data"

**The issue**: Semantic search doesn't understand temporal/chronological intent. It searches for meaning similarity, not recency.

## Solution

Added **hybrid retrieval strategy** that detects temporal queries and switches to database-based chronological retrieval:

### Changes Made

1. **Added temporal query detection** (`is_temporal_query` method):
   - Detects keywords: "last", "recent", "latest", "newest", "most recent", "past", "previous", "my trades", "all trades", "show me"
   - Returns `true` if query is asking for recent/chronological data

2. **Added database-based retrieval** (`get_recent_trades_from_db` method):
   - Fetches all trades from database
   - Sorts by `created_at` descending (most recent first)
   - Returns top N trades as `TradeDocument` objects

3. **Updated both chat services**:
   - `TradeChatService` (non-streaming): `backend/src/service/ai_service/chat_service/trades.rs`
   - `TradeStreamService` (streaming): `backend/src/service/ai_service/chat_service/trade_stream.rs`

### How It Works Now

```rust
// In stream_chat() and chat() methods:
let relevant_trades = if self.is_symbol_query(&message) {
    // Symbol-specific query: use semantic search
    self.vector_service
        .search_similar(&message, context_limit)
        .await?
} else if self.is_temporal_query(&message) {
    // Fetch most recent trades from database (chronological)
    self.get_recent_trades_from_db(context_limit).await?
} else {
    // Use semantic search (meaning-based)
    self.vector_service
        .search_similar(&message, context_limit)
        .await?
};
```

## Examples

### Symbol-Specific Queries (uses semantic search):
- "tell me more about my GH trades"
- "show me AAPL trades"
- "what about TSLA stock?"
- "analyze my NVDA positions"

### Temporal Queries (uses database chronological retrieval):
- "my last 5 trades"
- "show me recent trades"
- "what are my latest trades?"
- "my most recent positions"
- "all my trades"

### Semantic Queries (uses vector search):
- "trades with AAPL"
- "my profitable tech stocks"
- "trades where I got stopped out"
- "positions with high risk/reward"

## Benefits

1. **Accurate temporal queries**: Users can now ask for recent trades and get chronological results
2. **Symbol-specific queries**: Users can ask about specific stocks (e.g., "my GH trades") and get accurate results
3. **Preserved semantic search**: Concept-based queries still use vector similarity
4. **Better UX**: AI always has context when users ask about their trades
5. **Hybrid approach**: Best of all worlds - semantic understanding + temporal awareness + symbol detection

## Testing

To test the fix:

1. Ensure trades are loaded in the database
2. Start the backend server
3. Connect via WebSocket to `/ws/trades/chat`
4. Send: `{"type": "chat", "message": "my last 5 trades", "context_limit": 5}`
5. AI should now respond with actual trade data instead of "no access"

## Future Improvements

- Add more sophisticated temporal parsing (e.g., "trades from last week")
- Combine semantic + temporal (e.g., "my recent AAPL trades")
- Add date range filtering
- Cache recent trades for performance
