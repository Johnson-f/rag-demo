use anyhow::{Context, Result};
use rig::client::CompletionClient;
use rig::completion::Prompt;
use serde::{Deserialize, Serialize};

use crate::service::ai_service::{AiClient, TradeDocument, TradeVectorService};

/// Request for trade chat insights
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeChatRequest {
    pub message: String,
    #[serde(default = "default_context_limit")]
    pub context_limit: usize,
}

fn default_context_limit() -> usize {
    5
}

/// Response from trade chat
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeChatResponse {
    pub message: String,
    pub response: String,
    pub context_trades_count: usize,
}

/// Service for RAG-based chat about trades
pub struct TradeChatService {
    ai_client: AiClient,
    vector_service: TradeVectorService,
    db: crate::service::database::DatabaseClient,
}

impl TradeChatService {
    /// Create a new trade chat service
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

    /// Process a chat message using RAG pattern
    ///
    /// Flow:
    /// 1. Take user's message and generate embedding
    /// 2. Query Qdrant for top N most similar trade chunks
    /// 3. Build prompt with system instructions + retrieved context + user message
    /// 4. Send to LLM and return response
    pub async fn chat(&self, request: TradeChatRequest) -> Result<TradeChatResponse> {
        // Step 1 & 2: Generate embedding and search for relevant trades
        // The vector_service.search_similar already does both steps
        let relevant_trades = self
            .vector_service
            .search_similar(&request.message, request.context_limit)
            .await
            .context("Failed to search for relevant trades")?;

        let context_count = relevant_trades.len();

        // Step 3: Build the prompt with system instructions + context + user message
        let system_prompt = self.build_system_prompt();
        let context = self.build_context(&relevant_trades);
        let full_prompt = format!(
            "{}\n\n{}\n\nUser Question: {}\n\nProvide a helpful, detailed response based on the trade data above.",
            system_prompt, context, request.message
        );

        // Step 4: Send to LLM
        let agent = self
            .ai_client
            .client()
            .agent("upstage/solar-pro-3:free")
            .build();

        let response_text = agent
            .prompt(&full_prompt)
            .await
            .context("Failed to get LLM response")?;

        Ok(TradeChatResponse {
            message: request.message,
            response: response_text,
            context_trades_count: context_count,
        })
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

    /// Get a quick summary of all trades (without RAG, just stats)
    /// Uses direct database query to get ALL trades, not vector search
    pub async fn get_portfolio_summary(&self) -> Result<String> {
        // Fetch ALL trades from database (not vector search)
        let trades = crate::models::Trade::get_all(&self.db)
            .await
            .context("Failed to fetch trades from database")?;

        if trades.is_empty() {
            return Ok("No trades found in your portfolio.".to_string());
        }

        let total_trades = trades.len();
        let winning_trades = trades
            .iter()
            .filter(|t| t.profit.unwrap_or(0.0) > 0.0)
            .count();
        let losing_trades = total_trades - winning_trades;

        let total_profit: f64 = trades.iter().map(|t| t.profit.unwrap_or(0.0)).sum();

        let avg_profit_percent: f64 = if total_trades > 0 {
            trades
                .iter()
                .map(|t| t.profit_in_percent.unwrap_or(0.0))
                .sum::<f64>()
                / total_trades as f64
        } else {
            0.0
        };

        let win_rate = if total_trades > 0 {
            (winning_trades as f64 / total_trades as f64) * 100.0
        } else {
            0.0
        };

        Ok(format!(
            "Portfolio Summary:\n\
             - Total Trades: {}\n\
             - Winning Trades: {} ({:.1}% win rate)\n\
             - Losing Trades: {}\n\
             - Total Profit/Loss: ${:.2}\n\
             - Average Return: {:.2}%",
            total_trades, winning_trades, win_rate, losing_trades, total_profit, avg_profit_percent
        ))
    }
}
