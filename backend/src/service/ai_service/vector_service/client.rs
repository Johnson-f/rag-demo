use anyhow::{Context, Result};
use qdrant_client::Qdrant;
use std::env;

/// Configuration for Qdrant connection
#[derive(Debug, Clone)]
pub struct QdrantConfig {
    pub url: String,
    pub api_key: Option<String>,
}

impl QdrantConfig {
    /// Load configuration from environment variables
    /// Requires QDRANT_URL, optionally QDRANT_API_KEY
    pub fn from_env() -> Result<Self> {
        let url = env::var("QDRANT_URL")
            .context("QDRANT_URL environment variable not set")?;
        
        let api_key = env::var("QDRANT_API_KEY").ok();
        
        Ok(Self { url, api_key })
    }

    /// Create a new configuration with explicit values
    pub fn new(url: impl Into<String>, api_key: Option<String>) -> Self {
        Self {
            url: url.into(),
            api_key,
        }
    }
}

/// Vector store client for Qdrant
pub struct VectorClient {
    client: Qdrant,
}

impl VectorClient {
    /// Create a new vector client from configuration
    pub async fn new(config: QdrantConfig) -> Result<Self> {
        let client = if let Some(api_key) = config.api_key {
            Qdrant::from_url(&config.url)
                .api_key(api_key)
                .build()
                .context("Failed to connect to Qdrant with API key")?
        } else {
            Qdrant::from_url(&config.url)
                .build()
                .context("Failed to connect to Qdrant")?
        };
        
        Ok(Self { client })
    }

    /// Create a new vector client from environment variables
    pub async fn from_env() -> Result<Self> {
        let config = QdrantConfig::from_env()?;
        Self::new(config).await
    }

    /// Get the underlying Qdrant client
    pub fn client(&self) -> &Qdrant {
        &self.client
    }
}
