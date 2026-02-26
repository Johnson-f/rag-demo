use anyhow::{Context, Result};
use futures::stream::{Stream, StreamExt};
use rig::agent::MultiTurnStreamItem;
use rig::client::CompletionClient;
use rig::streaming::{StreamedAssistantContent, StreamingPrompt};
use std::pin::Pin;

use crate::service::ai_service::{AiClient, TradeDocument, TradeVectorService};

/// Streaming service for trade chat with markdown responses
pub struct TradeStreamService {
    ai_client: AiClient,
    vector_service: TradeVectorService,
    db: crate::service::database::DatabaseClient,
}

/// Chunk of streamed response
#[derive(Debug, Clone)]
pub enum StreamChunk {
    /// Text content chunk
    Text(String),
    /// Stream completed
    Done,
    /// Error occurred
    Error(String),
}

impl TradeStreamService {
    /// Create a new trade stream service
    pub fn new(
        ai_client: AiClient,
        vector_service: TradeVectorService,
        db: crate::service::database::DatabaseClient,
    ) -> Self {
        Self {
            ai_client,
            vector_service,
            db,
        }
    }

    /// Initialize from environment variables
    pub async fn from_env(db: crate::service::database::DatabaseClient) -> Result<Self> {
        let ai_client = AiClient::from_env()?;
        let vector_service = TradeVectorService::from_env().await?;
        Ok(Self::new(ai_client, vector_service, db))
    }

    /// Stream a chat response with RAG context
    ///
    /// Returns a stream of text chunks that can be sent to the client in real-time.
    /// The response is formatted in markdown for better readability.
    pub async fn stream_chat(
        &self,
        message: String,
        context_limit: usize,
    ) -> Result<Pin<Box<dyn Stream<Item = StreamChunk> + Send>>> {
        // Step 1 & 2: Search for relevant trades using vector similarity
        let relevant_trades = self
            .vector_service
            .search_similar(&message, context_limit)
            .await
            .context("Failed to search for relevant trades")?;

        // Step 3: Build the prompt with system instructions + context + user message
        let system_prompt = self.build_system_prompt();
        let context = self.build_context(&relevant_trades);
        let full_prompt = format!(
            "{}\n\n{}\n\nUser Question: {}\n\nProvide a helpful, detailed response in markdown format. Use formatting like headers, lists, and code blocks where appropriate.",
            system_prompt, context, message
        );

        // Step 4: Create streaming agent and get response stream
        let agent = self
            .ai_client
            .client()
            .agent("upstage/solar-pro-3:free")
            .build();

        // Use rig's streaming prompt interface
        let stream = agent.stream_prompt(&full_prompt).await;

        // Transform the rig stream into our StreamChunk format
        let chunk_stream = stream.map(|result| match result {
            Ok(MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::Text(text))) => {
                StreamChunk::Text(text.text)
            }
            Ok(MultiTurnStreamItem::StreamAssistantItem(
                StreamedAssistantContent::ReasoningDelta { reasoning, .. },
            )) => StreamChunk::Text(reasoning),
            Ok(MultiTurnStreamItem::FinalResponse(_))
            | Ok(MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::Final(_))) => {
                StreamChunk::Done
            }
            Ok(_) => {
                // Skip non-text streamed events (tool calls, tool results, reasoning metadata).
                StreamChunk::Text(String::new())
            }
            Err(e) => StreamChunk::Error(format!("Stream error: {}", e)),
        });

        Ok(Box::pin(chunk_stream))
    }

    /// Build the system prompt that guides the LLM's behavior
    fn build_system_prompt(&self) -> String {
        r#"You are a helpful trading assistant with access to a user's trade history.
Your role is to analyze their trades and provide insights, patterns, and recommendations.

Guidelines:
- Be specific and reference actual trades from the context when relevant
- Provide actionable insights based on the data
- If asked about performance, calculate and explain metrics clearly
- If the context doesn't contain relevant information, say so honestly
- Use a professional but friendly tone
- When discussing profits/losses, be objective and educational
- Format your response in markdown for better readability
- Use headers (##), lists, tables, and emphasis where appropriate

The trade data includes:
- Stock symbols and names
- Entry and exit prices
- Trade types (long/short)
- Profit/loss amounts and percentages
- Stop losses and risk/reward ratios
- Trade summaries and notes"#
            .to_string()
    }

    /// Build context from relevant trades
    fn build_context(&self, trades: &[TradeDocument]) -> String {
        if trades.is_empty() {
            return "No relevant trades found in the database.".to_string();
        }

        let mut context = String::from("Relevant Trade History:\n\n");

        for (i, trade) in trades.iter().enumerate() {
            context.push_str(&format!(
                "Trade {}:\n\
                 - Symbol: {} ({})\n\
                 - Type: {}\n\
                 - Entry Price: ${:.2}\n\
                 - Exit Price: ${:.2}\n\
                 - Profit: ${:.2} ({:.2}%)\n",
                i + 1,
                trade.stock_symbol,
                trade.stock_name,
                trade.trade_type.to_uppercase(),
                trade.entry_price,
                trade.exit_price,
                trade.profit.unwrap_or(0.0),
                trade.profit_in_percent.unwrap_or(0.0)
            ));

            if let Some(stop_loss) = trade.stop_loss {
                context.push_str(&format!("  - Stop Loss: ${:.2}\n", stop_loss));
            }

            if let Some(rr) = trade.risk_reward {
                context.push_str(&format!("  - Risk/Reward: 1:{:.2}\n", 1.0 / rr));
            }

            if let Some(notes) = &trade.notes {
                let notes_str: &str = notes;
                if !notes_str.is_empty() {
                    context.push_str(&format!("  - Notes: {}\n", notes_str));
                }
            }

            context.push_str(&format!("  - Summary: {}\n", trade.trade_summary));
            context.push_str(&format!("  - Date: {}\n\n", trade.created_at));
        }

        context
    }
}
