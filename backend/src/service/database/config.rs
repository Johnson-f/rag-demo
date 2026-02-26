use anyhow::Result;
use std::env;

#[derive(Debug, Clone)]
pub enum DatabaseConfig {
    Local { path: String },
    Remote { url: String, auth_token: String },
    Replica { local_path: String, url: String, auth_token: String },
}

impl DatabaseConfig {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self> {
        // Check if we have Turso credentials
        let url = env::var("TURSO_DATABASE_URL").ok();
        let token = env::var("TURSO_AUTH_TOKEN").ok();

        match (url, token) {
            (Some(url), Some(token)) => {
                // Check if we want embedded replica (default for production)
                let local_path = env::var("REPLICA_DB_PATH")
                    .unwrap_or_else(|_| "local-replica.db".to_string());
                
                Ok(Self::Replica {
                    local_path,
                    url,
                    auth_token: token,
                })
            }
            (None, None) => {
                // Fall back to local database
                let path = env::var("LOCAL_DB_PATH")
                    .unwrap_or_else(|_| "local.db".to_string());
                
                Ok(Self::Local { path })
            }
            _ => {
                anyhow::bail!("Invalid database configuration: both TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set together")
            }
        }
    }

    /// Create a local-only configuration
    pub fn local(path: impl Into<String>) -> Self {
        Self::Local { path: path.into() }
    }

    /// Create a remote-only configuration
    pub fn remote(url: impl Into<String>, auth_token: impl Into<String>) -> Self {
        Self::Remote {
            url: url.into(),
            auth_token: auth_token.into(),
        }
    }

    /// Create an embedded replica configuration
    pub fn replica(
        local_path: impl Into<String>,
        url: impl Into<String>,
        auth_token: impl Into<String>,
    ) -> Self {
        Self::Replica {
            local_path: local_path.into(),
            url: url.into(),
            auth_token: auth_token.into(),
        }
    }
}
