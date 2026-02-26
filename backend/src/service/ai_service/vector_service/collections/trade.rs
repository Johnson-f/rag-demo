use anyhow::{Context, Result};
use qdrant_client::qdrant::{
    CreateCollectionBuilder, Distance, PointStruct, UpsertPointsBuilder, VectorParamsBuilder,
    SearchPointsBuilder, DeletePointsBuilder, PointId, GetPointsBuilder,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;

use crate::models::Trade;
use crate::service::ai_service::{AiClient, VectorClient, EmbeddingService};

const COLLECTION_NAME: &str = "trades";

/// Trade document for vector storage with embeddings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeDocument {
    pub trade_id: String,
    pub stock_symbol: String,
    pub stock_name: String,
    pub entry_price: f64,
    pub exit_price: f64,
    pub trade_type: String,
    pub stop_loss: Option<f64>,
    pub risk_reward: Option<f64>,
    pub profit: Option<f64>,
    pub profit_in_percent: Option<f64>,
    pub initial_target: Option<f64>,
    pub notes: Option<String>,
    pub trade_summary: String,
    pub created_at: String,
}

impl From<&Trade> for TradeDocument {
    fn from(trade: &Trade) -> Self {
        Self {
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
        }
    }
}

/// Service for managing trade vectors in Qdrant
pub struct TradeVectorService {
    ai_client: AiClient,
    vector_client: VectorClient,
    embedding_service: EmbeddingService,
}

impl TradeVectorService {
    /// Create a new trade vector service
    pub fn new(ai_client: AiClient, vector_client: VectorClient, embedding_service: EmbeddingService) -> Self {
        Self {
            ai_client,
            vector_client,
            embedding_service,
        }
    }

    /// Initialize from environment variables
    pub async fn from_env() -> Result<Self> {
        let ai_client = AiClient::from_env()?;
        let vector_client = VectorClient::from_env().await?;
        let embedding_service = EmbeddingService::from_env()?;
        Ok(Self::new(ai_client, vector_client, embedding_service))
    }

    /// Ensure the trades collection exists in Qdrant
    pub async fn ensure_collection(&self) -> Result<()> {
        let client = self.vector_client.client();
        
        // Check if collection exists
        let collections = client.list_collections().await?;
        let exists = collections.collections.iter().any(|c| c.name == COLLECTION_NAME);
        
        if !exists {
            // Get the embedding dimension from the embedding service
            let vector_size = self.embedding_service.get_dimension().await? as u64;
            
            tracing::info!(
                "Creating trades collection with vector size {} using model {}",
                vector_size,
                self.embedding_service.model_name()
            );
            
            // Create collection with vector configuration
            client
                .create_collection(
                    CreateCollectionBuilder::new(COLLECTION_NAME)
                        .vectors_config(VectorParamsBuilder::new(vector_size, Distance::Cosine)),
                )
                .await
                .context("Failed to create trades collection")?;
            
            tracing::info!("Created trades collection in Qdrant");
        }
        
        Ok(())
    }

    /// Generate embedding for trade summary using OpenRouter
    async fn generate_embedding(&self, text: &str) -> Result<Vec<f32>> {
        self.embedding_service
            .embed_text(text)
            .await
            .context("Failed to generate embedding")
    }

    /// Create a vector document from a trade and store it in Qdrant
    pub async fn create(&self, trade: &Trade) -> Result<String> {
        let doc = TradeDocument::from(trade);
        
        // Generate embedding from trade summary using OpenRouter
        let embedding = self
            .generate_embedding(&doc.trade_summary)
            .await
            .context("Failed to generate embedding for trade")?;

        // Prepare the payload as a HashMap with qdrant Value type
        let mut payload: HashMap<String, qdrant_client::qdrant::Value> = HashMap::new();
        payload.insert("trade_id".to_string(), doc.trade_id.clone().into());
        payload.insert("stock_symbol".to_string(), doc.stock_symbol.clone().into());
        payload.insert("stock_name".to_string(), doc.stock_name.clone().into());
        payload.insert("entry_price".to_string(), doc.entry_price.into());
        payload.insert("exit_price".to_string(), doc.exit_price.into());
        payload.insert("trade_type".to_string(), doc.trade_type.clone().into());
        payload.insert("stop_loss".to_string(), json!(doc.stop_loss).to_string().into());
        payload.insert("risk_reward".to_string(), json!(doc.risk_reward).to_string().into());
        payload.insert("profit".to_string(), json!(doc.profit).to_string().into());
        payload.insert("profit_in_percent".to_string(), json!(doc.profit_in_percent).to_string().into());
        payload.insert("initial_target".to_string(), json!(doc.initial_target).to_string().into());
        payload.insert("notes".to_string(), json!(doc.notes).to_string().into());
        payload.insert("trade_summary".to_string(), doc.trade_summary.clone().into());
        payload.insert("created_at".to_string(), doc.created_at.clone().into());

        // Create point for Qdrant
        let point = PointStruct::new(
            doc.trade_id.clone(),
            embedding,
            payload,
        );

        // Upsert into Qdrant
        let client = self.vector_client.client();
        client
            .upsert_points(UpsertPointsBuilder::new(COLLECTION_NAME, vec![point]))
            .await
            .context("Failed to store trade vector in Qdrant")?;

        Ok(doc.trade_id)
    }

    /// Update a trade vector in Qdrant
    pub async fn update(&self, trade: &Trade) -> Result<()> {
        // For updates, we can just upsert with the same trade_id
        self.create(trade).await?;
        Ok(())
    }

    /// Delete a trade vector from Qdrant
    pub async fn delete(&self, trade_id: &str) -> Result<()> {
        let client = self.vector_client.client();
        
        client
            .delete_points(
                DeletePointsBuilder::new(COLLECTION_NAME)
                    .points(vec![PointId::from(trade_id.to_string())])
            )
            .await
            .context("Failed to delete trade vector from Qdrant")?;

        Ok(())
    }

    /// Search for similar trades using semantic search
    pub async fn search_similar(
        &self,
        query: &str,
        limit: usize,
    ) -> Result<Vec<TradeDocument>> {
        // Generate embedding for the query using OpenRouter
        let query_embedding = self
            .generate_embedding(query)
            .await
            .context("Failed to generate query embedding")?;

        let client = self.vector_client.client();
        
        // Search in Qdrant
        let results = client
            .search_points(
                SearchPointsBuilder::new(COLLECTION_NAME, query_embedding, limit as u64)
                    .with_payload(true)
            )
            .await
            .context("Failed to search trades in Qdrant")?;

        // Parse results into TradeDocument
        let mut trades = Vec::new();
        for result in results.result {
            let payload = result.payload;
            let payload_json = serde_json::to_value(payload)?;
            if let Ok(doc) = serde_json::from_value::<TradeDocument>(payload_json) {
                trades.push(doc);
            }
        }

        Ok(trades)
    }

    /// Get a specific trade by trade_id
    pub async fn get(&self, trade_id: &str) -> Result<Option<TradeDocument>> {
        let client = self.vector_client.client();
        
        let results = client
            .get_points(
                GetPointsBuilder::new(COLLECTION_NAME, vec![PointId::from(trade_id.to_string())])
                    .with_payload(true)
            )
            .await
            .context("Failed to get trade from Qdrant")?;

        if let Some(point) = results.result.first() {
            let payload = &point.payload;
            let payload_json = serde_json::to_value(payload)?;
            let doc = serde_json::from_value::<TradeDocument>(payload_json)
                .context("Failed to parse trade document")?;
            return Ok(Some(doc));
        }

        Ok(None)
    }

    /// Batch create multiple trades
    pub async fn batch_create(&self, trades: &[Trade]) -> Result<Vec<String>> {
        let mut trade_ids = Vec::new();
        
        for trade in trades {
            let id = self.create(trade).await?;
            trade_ids.push(id);
        }

        Ok(trade_ids)
    }

    /// Get AI insights about trades using RAG
    /// Note: This is a simplified version that returns relevant trade context.
    /// For full LLM integration, you'll need to configure the rig client properly.
    pub async fn get_insights(&self, query: &str) -> Result<String> {
        // Search for relevant trades
        let relevant_trades = self.search_similar(query, 5).await?;

        if relevant_trades.is_empty() {
            return Ok("No relevant trades found for your query.".to_string());
        }

        // Build context from relevant trades
        let context = relevant_trades
            .iter()
            .enumerate()
            .map(|(i, t)| {
                format!(
                    "Trade {}:\n- Symbol: {} ({})\n- Type: {}\n- Entry: ${:.2}, Exit: ${:.2}\n- Profit: {:.2}%\n- Summary: {}\n",
                    i + 1,
                    t.stock_symbol,
                    t.stock_name,
                    t.trade_type,
                    t.entry_price,
                    t.exit_price,
                    t.profit_in_percent.unwrap_or(0.0),
                    t.trade_summary
                )
            })
            .collect::<Vec<_>>()
            .join("\n");

        Ok(format!(
            "Based on your query '{}', here are the most relevant trades:\n\n{}",
            query, context
        ))
    }
}
