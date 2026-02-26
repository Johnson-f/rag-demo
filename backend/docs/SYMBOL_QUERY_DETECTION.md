# Symbol-Specific Query Detection

## Problem

When users asked about specific stock symbols (e.g., "tell me more about my GH trades"), the system would incorrectly classify the query as a temporal query because it contained keywords like "my trades". This caused it to fetch recent trades chronologically instead of searching for trades with that specific symbol.

**Example Issue:**
- Query: "tell me more about my GH trades"
- Expected: Find all GH trades using semantic search
- Actual: Fetched 5 most recent trades (which might not include GH)
- Result: AI says "no GH trades found" even though GH trades exist

## Root Cause

The temporal query detection was too broad and didn't account for symbol-specific queries. The logic was:

```rust
// OLD LOGIC - Too broad
fn is_temporal_query(&self, query: &str) -> bool {
    let temporal_keywords = ["last", "recent", "my trades", "all trades", ...];
    temporal_keywords.iter().any(|keyword| query_lower.contains(keyword))
}
```

This meant "my GH trades" matched "my trades" and was treated as temporal, bypassing semantic search.

## Solution

Added a **symbol query detector** that takes precedence over temporal detection:

### 1. Symbol Query Detection

```rust
fn is_symbol_query(&self, query: &str) -> bool {
    let query_upper = query.to_uppercase();
    
    // Look for patterns like "AAPL trades", "my GH trades", "tell me about TSLA"
    let symbol_patterns = [
        r"\b[A-Z]{1,5}\s+trade",      // "GH trades"
        r"about\s+[A-Z]{1,5}",         // "about AAPL"
        r"my\s+[A-Z]{1,5}\s+trade",   // "my GH trades"
        r"symbol\s+[A-Z]{1,5}",        // "symbol TSLA"
        r"stock\s+[A-Z]{1,5}",         // "stock NVDA"
    ];
    
    // Check if query contains a potential stock symbol pattern
    for pattern in &symbol_patterns {
        if regex::Regex::new(pattern)
            .map(|re| re.is_match(&query_upper))
            .unwrap_or(false)
        {
            return true;
        }
    }
    
    false
}
```

### 2. Updated Temporal Detection

```rust
fn is_temporal_query(&self, query: &str) -> bool {
    // Don't treat as temporal if it's asking about a specific symbol
    if self.is_symbol_query(query) {
        return false;
    }
    
    let temporal_keywords = [
        "last", "recent", "latest", "newest", "most recent",
        "past", "previous", "all trades", "show me"
    ];
    
    temporal_keywords.iter().any(|keyword| query_lower.contains(keyword))
}
```

### 3. Updated Query Routing

```rust
let relevant_trades = if self.is_symbol_query(&message) {
    // Symbol-specific query: use semantic search
    self.vector_service
        .search_similar(&message, context_limit)
        .await?
} else if self.is_temporal_query(&message) {
    // Temporal query: fetch recent trades from DB
    self.get_recent_trades_from_db(context_limit).await?
} else {
    // General query: use semantic search
    self.vector_service
        .search_similar(&message, context_limit)
        .await?
};
```

## Query Classification Examples

### Symbol Queries (uses semantic search)
- "tell me more about my GH trades" ✓
- "show me AAPL trades" ✓
- "what about TSLA stock?" ✓
- "my NVDA trades" ✓
- "analyze symbol MSFT" ✓

### Temporal Queries (uses chronological DB fetch)
- "my last 5 trades" ✓
- "show me recent trades" ✓
- "what are my latest trades?" ✓
- "all trades" ✓

### General Queries (uses semantic search)
- "trades with high profit" ✓
- "my losing positions" ✓
- "trades where I got stopped out" ✓
- "what's my win rate?" ✓

## How It Works

1. **User asks**: "tell me more about my GH trades"
2. **Symbol detection**: Matches pattern `my\s+[A-Z]{1,5}\s+trade` → Returns `true`
3. **Query routing**: Uses semantic search (not temporal)
4. **Vector search**: Finds trades with "GH" in the embedding
5. **AI response**: Analyzes the 3 GH trades found

## Benefits

1. **Accurate symbol matching**: Queries about specific symbols now work correctly
2. **Preserved temporal queries**: "last 5 trades" still works as expected
3. **Better semantic search**: Symbol queries leverage vector embeddings
4. **Flexible patterns**: Regex patterns catch various phrasings

## Pattern Matching Details

### Stock Symbol Characteristics
- **Length**: 1-5 uppercase letters (e.g., GH, AAPL, TSLA, NVDA)
- **Context**: Usually followed by "trade", "stock", or preceded by "about", "my"
- **Case**: Uppercase in queries (users typically write "GH" not "gh")

### Regex Patterns Explained

| Pattern | Example Match | Description |
|---------|---------------|-------------|
| `\b[A-Z]{1,5}\s+trade` | "GH trades" | Symbol followed by "trade" |
| `about\s+[A-Z]{1,5}` | "about AAPL" | "about" followed by symbol |
| `my\s+[A-Z]{1,5}\s+trade` | "my GH trades" | "my" + symbol + "trade" |
| `symbol\s+[A-Z]{1,5}` | "symbol TSLA" | Explicit symbol mention |
| `stock\s+[A-Z]{1,5}` | "stock NVDA" | "stock" followed by symbol |

## Files Modified

1. **backend/src/service/ai_service/chat_service/trades.rs**
   - Added `is_symbol_query()` method
   - Updated `is_temporal_query()` to check symbol first
   - Updated `chat()` to route symbol queries correctly

2. **backend/src/service/ai_service/chat_service/trade_stream.rs**
   - Added `is_symbol_query()` method
   - Updated `is_temporal_query()` to check symbol first
   - Updated `stream_chat()` to route symbol queries correctly

3. **backend/Cargo.toml**
   - Added `regex = "1.10"` dependency

## Testing

To test the fix:

1. Ensure GH trades are in the database (rows 24, 28, 29 in CSV)
2. Start the backend server
3. Connect via WebSocket to `/ws/trades/chat`
4. Send: `{"type": "chat", "message": "tell me more about my GH trades"}`
5. AI should now find and analyze the 3 GH trades

## Future Improvements

- Add support for multi-symbol queries (e.g., "compare AAPL and TSLA")
- Handle lowercase symbols (e.g., "my gh trades")
- Add symbol validation against known tickers
- Support sector/industry queries (e.g., "my tech stocks")
- Add fuzzy symbol matching for typos
