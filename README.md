# RAG Demo - AI-Powered Trade Journal

A full-stack application demonstrating RAG (Retrieval-Augmented Generation) with real-time streaming markdown responses.

## Features

- 📊 Trade journal with CRUD operations
- 🔍 Vector similarity search using Qdrant
- 💬 Real-time streaming AI chat with markdown formatting
- 🤖 RAG-based insights using Claude 3.5 Sonnet
- 🔌 WebSocket streaming with actix-ws
- ⚡ Modern async Rust backend with rig-core
- 🎨 Beautiful Next.js frontend with Tailwind CSS

## Quick Start

Get up and running in 5 minutes! See [STREAMING_QUICKSTART.md](STREAMING_QUICKSTART.md)

```bash
# Backend
cd backend
cargo run

# Frontend (new terminal)
cd frontend
bun dev
```

Open http://localhost:3000 and start chatting with your AI trading assistant!

## Architecture

This project demonstrates two complementary approaches:

### 1. Vector Database with RAG
- Store trade embeddings in Qdrant
- Semantic search for relevant context
- RAG pattern for AI-powered insights

### 2. Structured Data in SQL
- LibSQL/Turso for trade data
- Traditional CRUD operations
- Relational queries for analytics

### 3. Real-time Streaming
- WebSocket connection with actix-ws
- Token-by-token streaming from LLM
- Markdown-formatted responses
- Beautiful UI with real-time updates

## Tech Stack

### Backend
- **Rust** with Actix Web
- **actix-ws** for WebSocket streaming
- **rig-core** for LLM interactions
- **Qdrant** for vector search
- **LibSQL/Turso** for data storage
- **OpenRouter** for LLM access

### Frontend
- **Next.js 16** with React 19
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **react-markdown** for rendering
- **TanStack Query** for data fetching

## Documentation

- 📚 [Quick Start Guide](STREAMING_QUICKSTART.md) - Get started in 5 minutes
- 🔧 [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - Complete overview
- 🖥️ [Backend Details](backend/STREAMING_IMPLEMENTATION.md) - Backend architecture
- 🎨 [Frontend Guide](frontend/STREAMING_INTEGRATION.md) - Frontend integration
- 🔌 [WebSocket Service](backend/src/service/websocket/README.md) - WebSocket details

## Getting Started

### Prerequisites

- Rust and Cargo
- Node.js/Bun
- Docker (for Qdrant)
- OpenRouter API key

### Database Setup (Turso)

1. Install Turso CLI:
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

2. Create a database:
```bash
turso auth signup
turso db create my-database
turso db show --url my-database
turso db tokens create my-database
```

3. Start Qdrant:
```bash
docker run -p 6333:6333 qdrant/qdrant
```

4. Configure environment:
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials:
# - OPENROUTER_API_KEY
# - QDRANT_URL
# - DATABASE_URL
```

5. Run the backend:
```bash
cargo run
```

6. Run the frontend:
```bash
cd frontend
bun install
bun dev
```

See [backend/SETUP.md](backend/SETUP.md) for detailed instructions.

## Features in Detail

### Real-time Streaming Chat
- Ask questions about your trades
- Get instant, streaming responses
- Beautiful markdown formatting
- Copy responses to clipboard
- Connection status indicators

### Trade Management
- Create, read, update, delete trades
- Track profits, losses, and performance
- Store trade notes and summaries
- Calculate risk/reward ratios

### AI-Powered Insights
- Semantic search across trade history
- RAG-based contextual responses
- Pattern recognition in trading behavior
- Performance analysis and recommendations

## Example Usage

```typescript
// Frontend - Ask a question
const { sendMessage, response } = useTradeStream();
sendMessage("What's my best performing trade?");

// Backend - Stream response
let stream = stream_service.stream_chat(message, 5).await?;
while let Some(chunk) = stream.next().await {
    ws.send(WsMessage::TextChunk { content: chunk });
}
```

## Project Structure

```
.
├── backend/                 # Rust backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── service/        # Business logic
│   │   │   ├── websocket/  # WebSocket handling
│   │   │   ├── ai_service/ # AI/LLM integration
│   │   │   └── database/   # Database layer
│   │   └── models/         # Data models
│   └── Cargo.toml
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities & hooks
│   └── package.json
└── docs/                  # Documentation
```

## Contributing

This is a demo project showcasing RAG and streaming implementations. Feel free to use it as a reference for your own projects!

## License

MIT 