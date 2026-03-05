use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::mpsc;
use rig::client::CompletionClient;
use rig::completion::Prompt;

use crate::service::ai_service::{AiClient, TradeDocument, TradeVectorService};
use crate::service::database::DatabaseClient;

/// Events emitted during the multi-step analysis workflow
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AnalysisEvent {
    /// Step started
    StepStart {
        step: String,
        description: String,
    },
    /// Step completed
    StepComplete {
        step: String,
        data: Value,
    },
    /// Query classification result
    QueryClassified {
        query_type: String,
        confidence: String,
    },
    /// Trades retrieval progress
    TradesRetrieving {
        strategy: String,
        limit: usize,
    },
    /// Trades retrieved
    TradesRetrieved {
        count: usize,
        trades: Vec<TradeDocument>,
    },
    /// Analysis generation started
    AnalysisGenerating {
        model: String,
        context_size: usize,
    },
    /// Analysis chunk (streaming)
    AnalysisChunk {
        content: String,
    },
    /// Analysis complete
    AnalysisComplete {
        analysis: String,
    },
    /// Error occurred
    Error {
        message: String,
    },
    /// Workflow complete
    Complete,
}

/// Streaming multi-step trade analysis agent
pub struct StreamingMultiStepAgent {
    ai_client: Arc<AiClient>,
    vector_service: Arc<TradeVectorService>,
    db: Arc<DatabaseClient>,
    context_limit: usize,
}

impl StreamingMultiStepAgent {
    pub fn new(
        ai_client: AiClient,
        vector_service: TradeVectorService,
        db: DatabaseClient,
        context_limit: usize,
    ) -> Self {
        Self {
            ai_client: Arc::new(ai_client),
            vector_service: Arc::new(vector_service),
            db: Arc::new(db),
            context_limit,
        }
    }

    /// Create from environment variables
    pub async fn from_env(db: DatabaseClient) -> Result<Self> {
        let ai_client = AiClient::from_env()?;
        let vector_service = TradeVectorService::from_env().await?;
        Ok(Self::new(ai_client, vector_service, db, 5))
    }

    /// Execute the agent with streaming events
    pub async fn execute_stream(
        &self,
        user_query: String,
    ) -> Result<mpsc::Receiver<AnalysisEvent>> {
        let (tx, rx) = mpsc::channel(100);

        let ai_client = Arc::clone(&self.ai_client);
        let vector_service = Arc::clone(&self.vector_service);
        let db = Arc::clone(&self.db);
        let context_limit = self.context_limit;

        // Spawn async task to process the workflow
        tokio::spawn(async move {
            if let Err(e) = Self::process_workflow(
                user_query,
                ai_client,
                vector_service,
                db,
                context_limit,
                tx.clone(),
            )
            .await
            {
                let _ = tx
                    .send(AnalysisEvent::Error {
                        message: e.to_string(),
                    })
                    .await;
            }
        });

        Ok(rx)
    }

    async fn process_workflow(
        user_query: String,
        ai_client: Arc<AiClient>,
        vector_service: Arc<TradeVectorService>,
        db: Arc<DatabaseClient>,
        context_limit: usize,
        tx: mpsc::Sender<AnalysisEvent>,
    ) -> Result<()> {
        // Step 1: Classify Query
        let _ = tx
            .send(AnalysisEvent::StepStart {
                step: "classify".to_string(),
                description: "Analyzing query type...".to_string(),
            })
            .await;

        let query_type = Self::classify_query(&user_query);
        
        let _ = tx
            .send(AnalysisEvent::QueryClassified {
                query_type: query_type.clone(),
                confidence: "high".to_string(),
            })
            .await;

        let _ = tx
            .send(AnalysisEvent::StepComplete {
                step: "classify".to_string(),
                data: json!({ "query_type": query_type }),
            })
            .await;

        // Step 2: Retrieve Trades
        let _ = tx
            .send(AnalysisEvent::StepStart {
                step: "retrieve".to_string(),
                description: "Fetching relevant trades...".to_string(),
            })
            .await;

        let strategy = match query_type.as_str() {
            "symbol" => "Vector Search (Symbol Match)",
            "temporal" => "Database Query (Chronological)",
            "semantic" => "Vector Search (Semantic Similarity)",
            _ => "Vector Search",
        };

        let _ = tx
            .send(AnalysisEvent::TradesRetrieving {
                strategy: strategy.to_string(),
                limit: context_limit,
            })
            .await;

        let trades = Self::retrieve_trades(
            &user_query,
            &query_type,
            &vector_service,
            &db,
            context_limit,
        )
        .await?;

        let _ = tx
            .send(AnalysisEvent::TradesRetrieved {
                count: trades.len(),
                trades: trades.clone(),
            })
            .await;

        let _ = tx
            .send(AnalysisEvent::StepComplete {
                step: "retrieve".to_string(),
                data: json!({ "trades_count": trades.len() }),
            })
            .await;

        // Step 3: Generate Analysis
        let _ = tx
            .send(AnalysisEvent::StepStart {
                step: "analyze".to_string(),
                description: "Generating insights...".to_string(),
            })
            .await;

        let system_prompt = Self::build_system_prompt();
        let context = Self::build_context(&trades);
        let full_prompt = format!(
            "{}\n\n{}\n\nUser Question: {}\n\nProvide a helpful, detailed response in markdown format.",
            system_prompt, context, user_query
        );

        let _ = tx
            .send(AnalysisEvent::AnalysisGenerating {
                model: "nvidia/nemotron-3-nano-30b-a3b:free".to_string(),
                context_size: full_prompt.len(),
            })
            .await;

        let agent = ai_client
            .client()
            .agent("nvidia/nemotron-3-nano-30b-a3b:free")
            .build();

        let analysis = agent.prompt(&full_prompt).await?;

        let _ = tx
            .send(AnalysisEvent::AnalysisComplete {
                analysis: analysis.clone(),
            })
            .await;

        let _ = tx
            .send(AnalysisEvent::StepComplete {
                step: "analyze".to_string(),
                data: json!({ "analysis_length": analysis.len() }),
            })
            .await;

        // Workflow complete
        let _ = tx.send(AnalysisEvent::Complete).await;

        Ok(())
    }

    fn classify_query(query: &str) -> String {
        if Self::is_symbol_query(query) {
            "symbol".to_string()
        } else if Self::is_temporal_query(query) {
            "temporal".to_string()
        } else {
            "semantic".to_string()
        }
    }

    async fn retrieve_trades(
        user_query: &str,
        query_type: &str,
        vector_service: &TradeVectorService,
        db: &DatabaseClient,
        context_limit: usize,
    ) -> Result<Vec<TradeDocument>> {
        match query_type {
            "symbol" | "semantic" => {
                vector_service
                    .search_similar(user_query, context_limit)
                    .await
                    .context("Vector search failed")
            }
            "temporal" => Self::get_recent_trades_from_db(db, context_limit).await,
            _ => Ok(Vec::new()),
        }
    }

    fn is_symbol_query(query: &str) -> bool {
        let query_upper = query.to_uppercase();
        let symbol_patterns = [
            r"\b[A-Z]{1,5}\s+trade",
            r"about\s+[A-Z]{1,5}",
            r"my\s+[A-Z]{1,5}\s+trade",
            r"symbol\s+[A-Z]{1,5}",
            r"stock\s+[A-Z]{1,5}",
        ];

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

    fn is_temporal_query(query: &str) -> bool {
        let query_lower = query.to_lowercase();
        let temporal_keywords = [
            "last", "recent", "latest", "newest", "most recent",
            "past", "previous", "all trades", "show me",
        ];
        temporal_keywords
            .iter()
            .any(|keyword| query_lower.contains(keyword))
    }

    fn build_system_prompt() -> String {
        r#"You are a helpful trading assistant with access to a user's trade history.
Your role is to analyze their trades and provide insights, patterns, and recommendations.

Guidelines:
- Be specific and reference actual trades from the context when relevant
- Provide actionable insights based on the data
- If asked about performance, calculate and explain metrics clearly
- If the context doesn't contain relevant information, say so honestly
- Use a professional but friendly tone
- When discussing profits/losses, be objective and educational
- Format your response in markdown for better readability"#
            .to_string()
    }

    fn build_context(trades: &[TradeDocument]) -> String {
        if trades.is_empty() {
            return "No relevant trades found in the database.".to_string();
        }

        let mut context = String::from("Relevant Trade History:\n\n");
        for (i, trade) in trades.iter().enumerate() {
            context.push_str(&format!(
                "Trade {}:\n\
                 - Symbol: {} ({})\n\
                 - Type: {}\n\
                 - Entry: ${:.2}, Exit: ${:.2}\n\
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

            if let Some(notes) = &trade.notes {
                if !notes.is_empty() {
                    context.push_str(&format!("  - Notes: {}\n", notes));
                }
            }
            context.push_str(&format!("  - Summary: {}\n\n", trade.trade_summary));
        }
        context
    }

    async fn get_recent_trades_from_db(
        db: &DatabaseClient,
        limit: usize,
    ) -> Result<Vec<TradeDocument>> {
        use crate::models::Trade;

        let trades = Trade::get_all(db)
            .await
            .context("Failed to fetch trades from database")?;

        let mut sorted_trades = trades;
        sorted_trades.sort_by(|a, b| {
            b.created_at
                .as_ref()
                .unwrap_or(&String::new())
                .cmp(a.created_at.as_ref().unwrap_or(&String::new()))
        });

        let trade_docs: Vec<TradeDocument> = sorted_trades
            .iter()
            .take(limit)
            .map(|trade| TradeDocument {
                trade_id: trade.trade_id.clone(),
                stock_symbol: trade.stock_symbol.clone(),
                stock_name: trade.stock_name.clone(),
                entry_price: trade.entry_price,
                exit_price: trade.exit_price,
                trade_type: trade.trade_type.as_str().to_string(),
                stop_loss: trade.stop_loss,
                risk_reward: trade.risk_reward,
                profit: trade.profit,
                profit_in_percent: trade.profit_in_percent,
                initial_target: trade.initial_target,
                notes: trade.notes.clone(),
                trade_summary: trade.trade_summary.clone().unwrap_or_default(),
                created_at: trade.created_at.clone().unwrap_or_default(),
            })
            .collect();

        Ok(trade_docs)
    }
}
