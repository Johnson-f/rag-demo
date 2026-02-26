# Trade Chat Streaming Implementation

Real-time markdown streaming for trade analysis using rig-core and OpenRouter.

## Quick Start

The `TradeStreamService` provides streaming responses for trade chat:

```rust
let mut stream = stream_service
    .stream_chat("What's my best trade?".to_string(), 5)
    .await?;

while let Some(chunk) = stream.next().await {
    match chunk {
        StreamChunk::Text(text) => print!("{}", text),
        StreamChunk::Done => break,
        StreamChunk::Error(e) => eprintln!("Error: {}", e),
    }
}
```

## Architecture

Uses rig-core's `StreamingPrompt` trait with OpenRouter:
- Real-time token streaming from Claude 3.5 Sonnet
- Markdown-formatted responses
- RAG-based context from vector search
- WebSocket delivery to frontend

## References

- [rig-core Streaming](https://docs.rig.rs/docs/concepts/streaming)
- [OpenRouter Streaming](https://openrouter.ai/docs/api-reference/streaming)
- [actix-ws](https://docs.rs/actix-ws/0.4.0/actix_ws/)
