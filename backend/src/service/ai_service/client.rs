use anyhow::{Context, Result};
use rig::client::CompletionClient;
use rig::providers::openrouter;
use std::env;

/// AI client for interacting with OpenRouter
#[derive(Clone)]
pub struct AiClient {
    client: openrouter::Client,
}

impl AiClient {
    /// Create a new AI client from environment variables
    /// Requires OPENROUTER_API_KEY environment variable
    pub fn from_env() -> Result<Self> {
        let api_key = env::var("OPENROUTER_API_KEY")
            .context("OPENROUTER_API_KEY environment variable not set")?;

        let client = openrouter::Client::new(&api_key)?;

        Ok(Self { client })
    }

    /// Create a new AI client with explicit API key
    pub fn new(api_key: &str) -> Result<Self> {
        Ok(Self {
            client: openrouter::Client::new(api_key)?,
        })
    }

    /// Get the underlying OpenRouter client
    pub fn client(&self) -> &openrouter::Client {
        &self.client
    }

    /// Create a completion model with a specific model
    /// Common models: "upstage/solar-pro-3:free", "openai/gpt-4", "meta-llama/llama-3.1-70b-instruct"
    pub fn completion_model(&self, model: &str) -> openrouter::CompletionModel {
        self.client.completion_model(model)
    }
}
