use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use tracing::{info, warn};

use LangGraph::core::graph::{StateGraph, StateSchema};
use LangGraph::core::types::{ChannelWrite, ExecutionContext, NodeExecutionError, NodeExecutionResult};
use LangGraph::checkpoint::base::CheckpointConfig;
use LangGraph::runtime::r#loop::LoopConfig;

use crate::service::ai_service::{AiClient, TradeDocument, TradeVectorService};
use crate::service::database::DatabaseClient;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeAnalysisState {
    pub user_query: String,
    pub query_type: Option<String>,
    pub retrieved_trades: Vec<TradeDocument>,
    pub analysis: String,
    pub conversation_history: Vec<Message>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

pub struct MultiStepTradeAgent {
    ai_client: Arc<AiClient>,
    vector_service: Arc<TradeVectorService>,
    db: Arc<DatabaseClient>,
    context_limit: usize,
}

impl MultiStepTradeAgent {
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

    pub async fn from_env(db: DatabaseClient) -> Result<Self> {
        let ai_client = AiClient::from_env()?;
        let vector_service = TradeVectorService::from_env().await?;
        Ok(Self::new(ai_client, vector_service, db, 5))
    }

    fn build_graph(&self, handle: tokio::runtime::Handle) -> Result<StateGraph> {
        let state_schema = StateSchema::new()
            .with_last_value("user_query")
            .context("Failed to add user_query field")?
            .with_last_value("query_type")
            .context("Failed to add query_type field")?
            .with_last_value("retrieved_trades")
            .context("Failed to add retrieved_trades field")?
            .with_last_value("analysis")
            .context("Failed to add analysis field")?
            .with_last_value("conversation_history")
            .context("Failed to add conversation_history field")?;

        let mut graph = StateGraph::new(state_schema);

        let ai_client_classify = Arc::clone(&self.ai_client);
        let vector_service_retrieve = Arc::clone(&self.vector_service);
        let db_retrieve = Arc::clone(&self.db);
        let ai_client_generate = Arc::clone(&self.ai_client);
        let context_limit = self.context_limit;

        let handle_retrieve = handle.clone();

        graph.add_node("classify_query", move |input: Value, _ctx: ExecutionContext| {
            classify_query_node(input, &ai_client_classify)
        })?;

        graph.add_node("retrieve_trades", move |input: Value, _ctx: ExecutionContext| {
            retrieve_trades_node(input, &vector_service_retrieve, &db_retrieve, context_limit, &handle_retrieve)
        })?;

        graph.add_node("generate_analysis", move |input: Value, _ctx: ExecutionContext| {
            generate_analysis_node(input, &ai_client_generate)
        })?;

        graph.set_entry_point("classify_query")?;
        graph.add_edge("classify_query", "retrieve_trades")?;
        graph.add_edge("retrieve_trades", "generate_analysis")?;
        graph.set_finish_point("generate_analysis")?;

        Ok(graph)
    }

    pub async fn execute(&self, user_query: String) -> Result<TradeAnalysisState> {
        info!("[execute] Starting agent for query: {:?}", user_query);

        let handle = tokio::runtime::Handle::current();

        let graph = self.build_graph(handle)?;
        let compiled = graph.compile()?;
        info!("[execute] Graph compiled successfully, invoking...");

        let input = json!({
            "user_query": user_query,
            "query_type": null,
            "retrieved_trades": [],
            "analysis": "",
            "conversation_history": []
        });

        let config = LoopConfig::new(CheckpointConfig::new("trade-analysis"));
        let output = compiled.invoke(None, config, input)?;
        info!("[execute] Graph finished, deserializing output...");

        let state: TradeAnalysisState = serde_json::from_value(output)
            .context("Failed to deserialize output state")?;

        info!("[execute] Done. Query type was: {:?}", state.query_type);
        Ok(state)
    }
}

fn classify_query_node(
    input: Value,
    _ai_client: &AiClient,
) -> Result<NodeExecutionResult, NodeExecutionError> {
    info!("[classify_query] Node entered");

    let user_query = input
        .get("user_query")
        .and_then(|v| v.as_str())
        .ok_or_else(|| NodeExecutionError::fatal("Missing user_query in input"))?;

    let query_type = if is_symbol_query(user_query) {
        "symbol"
    } else if is_temporal_query(user_query) {
        "temporal"
    } else {
        "semantic"
    };

    info!("[classify_query] Classified {:?} as: {:?}", user_query, query_type);

    Ok(NodeExecutionResult::default()
        .with_write(ChannelWrite::new("query_type", Value::String(query_type.to_string()))))
}

fn retrieve_trades_node(
    input: Value,
    vector_service: &Arc<TradeVectorService>,
    db: &DatabaseClient,
    context_limit: usize,
    _handle: &tokio::runtime::Handle,
) -> Result<NodeExecutionResult, NodeExecutionError> {
    info!("[retrieve_trades] Node entered");

    let user_query = input
        .get("user_query")
        .and_then(|v| v.as_str())
        .ok_or_else(|| NodeExecutionError::fatal("Missing user_query"))?
        .to_string();

    let query_type = input
        .get("query_type")
        .and_then(|v| v.as_str())
        .ok_or_else(|| NodeExecutionError::fatal("Missing query_type"))?
        .to_string();

    info!("[retrieve_trades] Query type: {:?}, fetching up to {} trades", query_type, context_limit);

    let trades = match query_type.as_str() {
        "symbol" | "semantic" => {
            info!("[retrieve_trades] Using vector search");

            // Clone the Arc to get an owned value for the thread
            let vector_service = Arc::clone(vector_service);

            std::thread::spawn(move || -> anyhow::Result<Vec<TradeDocument>> {
                let rt = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .map_err(|e| anyhow::anyhow!("Failed to build runtime: {}", e))?;

                rt.block_on(async move {
                    vector_service
                        .search_similar(&user_query, context_limit)
                        .await
                        .map_err(|e| anyhow::anyhow!("Vector search failed: {}", e))
                })
            })
            .join()
            .map_err(|_| NodeExecutionError::fatal("Thread panicked during vector search"))?
            .map_err(|e| NodeExecutionError::fatal(format!("Vector search failed: {}", e)))?
        }
        "temporal" => {
            info!("[retrieve_trades] Using database query");

            let db = db.clone();

            std::thread::spawn(move || -> anyhow::Result<Vec<TradeDocument>> {
                let rt = tokio::runtime::Builder::new_current_thread()
                    .enable_all()
                    .build()
                    .map_err(|e| anyhow::anyhow!("Failed to build runtime: {}", e))?;

                rt.block_on(async move {
                    get_recent_trades_from_db(&db, context_limit).await
                })
            })
            .join()
            .map_err(|_| NodeExecutionError::fatal("Thread panicked during DB query"))?
            .map_err(|e| NodeExecutionError::fatal(format!("Database query failed: {}", e)))?
        }
        _ => {
            warn!("[retrieve_trades] Unknown query type {:?}, returning empty", query_type);
            Vec::new()
        }
    };

    info!("[retrieve_trades] Retrieved {} trades", trades.len());

    let trades_json = serde_json::to_value(&trades)
        .map_err(|e| NodeExecutionError::fatal(format!("Failed to serialize trades: {}", e)))?;

    Ok(NodeExecutionResult::default()
        .with_write(ChannelWrite::new("retrieved_trades", trades_json)))
}

fn generate_analysis_node(
    input: Value,
    _ai_client: &AiClient,
) -> Result<NodeExecutionResult, NodeExecutionError> {
    info!("[generate_analysis] Node entered");

    let user_query = input
        .get("user_query")
        .and_then(|v| v.as_str())
        .ok_or_else(|| NodeExecutionError::fatal("Missing user_query"))?
        .to_string();

    let trades: Vec<TradeDocument> = input
        .get("retrieved_trades")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    info!("[generate_analysis] Building prompt with {} trades", trades.len());

    let system_prompt = build_system_prompt();
    let context = build_context(&trades);
    let full_prompt = format!(
        "{}\n\n{}\n\nUser Question: {}\n\nProvide a helpful, detailed response in markdown format.",
        system_prompt, context, user_query
    );

    info!("[generate_analysis] Calling LLM (prompt length: {} chars)...", full_prompt.len());

    let api_key = std::env::var("GROQ_API_KEY")
        .map_err(|_| NodeExecutionError::fatal("GROQ_API_KEY not set"))?;

    info!("[generate_analysis] API key found, spawning dedicated runtime...");

    let response: String = std::thread::spawn(move || -> anyhow::Result<String> {
        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .map_err(|e| anyhow::anyhow!("Failed to build runtime: {}", e))?;

        rt.block_on(async {
            let client = reqwest::Client::new();

            let body = json!({
                "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                "messages": [
                    {
                        "role": "user",
                        "content": full_prompt
                    }
                ],
                "max_tokens": 1024
            });

            info!("[generate_analysis] Sending HTTP request to Groq API...");

            let res = tokio::time::timeout(
                std::time::Duration::from_secs(30),
                client
                    .post("https://api.groq.com/openai/v1/chat/completions")
                    .header("Authorization", format!("Bearer {}", api_key))
                    .header("Content-Type", "application/json")
                    .json(&body)
                    .send(),
            )
            .await
            .map_err(|_| anyhow::anyhow!("Request timed out after 30s"))?
            .map_err(|e| anyhow::anyhow!("HTTP request failed: {}", e))?;

            info!("[generate_analysis] Got HTTP response, status: {}", res.status());

            let json: Value = res.json().await
                .map_err(|e| anyhow::anyhow!("Failed to parse response: {}", e))?;

            info!("[generate_analysis] Response parsed: {:?}", json);

            let content = json["choices"][0]["message"]["content"]
                .as_str()
                .ok_or_else(|| anyhow::anyhow!("No content in response: {:?}", json))?
                .to_string();

            Ok(content)
        })
    })
    .join()
    .map_err(|_| NodeExecutionError::fatal("Thread panicked during LLM call"))?
    .map_err(|e| NodeExecutionError::fatal(format!("AI generation failed: {}", e)))?;

    info!("[generate_analysis] LLM responded ({} chars)", response.len());

    Ok(NodeExecutionResult::default()
        .with_write(ChannelWrite::new("analysis", Value::String(response))))
}

// Helper functions

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
    temporal_keywords.iter().any(|keyword| query_lower.contains(keyword))
}

fn build_system_prompt() -> String {
    "You are a trading assistant. Analyze the trades and give concise, actionable insights. Reference specific trades when relevant. Respond in markdown.".to_string()
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

    info!("[get_recent_trades_from_db] Fetching all trades from DB...");

    let trades = Trade::get_all(db)
        .await
        .context("Failed to fetch trades from database")?;

    info!("[get_recent_trades_from_db] Got {} total trades, taking latest {}", trades.len(), limit);

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

    info!("[get_recent_trades_from_db] Returning {} trade docs", trade_docs.len());

    Ok(trade_docs)
}
