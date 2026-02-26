use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::env;

const OPENROUTER_API_URL: &str = "https://openrouter.ai/api/v1/embeddings";

/// Request body for OpenRouter embeddings API
#[derive(Debug, Serialize)]
struct EmbeddingRequest {
    model: String,
    input: Vec<String>,
}

/// Response from OpenRouter embeddings API
#[derive(Debug, Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
}

#[derive(Debug, Deserialize)]
struct EmbeddingData {
    embedding: Vec<f32>,
}

/// Service for generating embeddings using OpenRouter
#[derive(Clone)]
pub struct EmbeddingService {
    api_key: String,
    model: String,
    client: reqwest::Client,
}

impl EmbeddingService {
    /// Create a new embedding service from environment variables
    /// Requires OPENROUTER_API_KEY environment variable
    pub fn from_env() -> Result<Self> {
        let api_key = env::var("OPENROUTER_API_KEY")
            .context("OPENROUTER_API_KEY environment variable not set")?;
        
        // Default to a good quality, cost-effective embedding model
        let model = env::var("EMBEDDING_MODEL")
            .unwrap_or_else(|_| "nvidia/llama-nemotron-embed-vl-1b-v2:free".to_string());
        
        Ok(Self {
            api_key,
            model,
            client: reqwest::Client::new(),
        })
    }

    /// Create a new embedding service with explicit parameters
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            api_key,
            model,
            client: reqwest::Client::new(),
        }
    }

    /// Generate embeddings for a single text
    pub async fn embed_text(&self, text: &str) -> Result<Vec<f32>> {
        let embeddings = self.embed_batch(&[text.to_string()]).await?;
        embeddings
            .into_iter()
            .next()
            .context("No embedding returned from API")
    }

    /// Generate embeddings for multiple texts in a single request
    pub async fn embed_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        if texts.is_empty() {
            return Ok(Vec::new());
        }

        let request_body = EmbeddingRequest {
            model: self.model.clone(),
            input: texts.to_vec(),
        };

        let response = self
            .client
            .post(OPENROUTER_API_URL)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .context("Failed to send embedding request to OpenRouter")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            anyhow::bail!(
                "OpenRouter API returned error {}: {}",
                status,
                error_text
            );
        }

        let embedding_response: EmbeddingResponse = response
            .json()
            .await
            .context("Failed to parse embedding response")?;

        Ok(embedding_response
            .data
            .into_iter()
            .map(|d| d.embedding)
            .collect())
    }

    /// Get the embedding dimension for the current model
    /// This is useful for configuring vector databases
    pub async fn get_dimension(&self) -> Result<usize> {
        // Generate a test embedding to determine dimension
        let test_embedding = self.embed_text("test").await?;
        Ok(test_embedding.len())
    }

    /// Get the current model name
    pub fn model_name(&self) -> &str {
        &self.model
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires API key
    async fn test_embed_text() {
        let service = EmbeddingService::from_env().unwrap();
        let embedding = service.embed_text("Hello, world!").await.unwrap();
        assert!(!embedding.is_empty());
        println!("Embedding dimension: {}", embedding.len());
    }

    #[tokio::test]
    #[ignore] // Requires API key
    async fn test_embed_batch() {
        let service = EmbeddingService::from_env().unwrap();
        let texts = vec![
            "Hello, world!".to_string(),
            "This is a test.".to_string(),
        ];
        let embeddings = service.embed_batch(&texts).await.unwrap();
        assert_eq!(embeddings.len(), 2);
        assert!(!embeddings[0].is_empty());
        assert!(!embeddings[1].is_empty());
    }
}
