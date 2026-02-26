use anyhow::{Context, Result};
use libsql::{Builder, Connection, Database};
use std::sync::Arc;

use super::config::DatabaseConfig;

#[derive(Clone)]
pub struct DatabaseClient {
    db: Arc<Database>,
}

impl DatabaseClient {
    /// Create a new database client from configuration
    pub async fn new(config: DatabaseConfig) -> Result<Self> {
        let db = match config {
            DatabaseConfig::Local { path } => {
                Builder::new_local(&path)
                    .build()
                    .await
                    .context("Failed to create local database")?
            }
            DatabaseConfig::Remote { url, auth_token } => {
                Builder::new_remote(url, auth_token)
                    .build()
                    .await
                    .context("Failed to create remote database connection")?
            }
            DatabaseConfig::Replica { local_path, url, auth_token } => {
                Builder::new_remote_replica(&local_path, url, auth_token)
                    .build()
                    .await
                    .context("Failed to create embedded replica")?
            }
        };

        Ok(Self { db: Arc::new(db) })
    }

    /// Create a new local database connection
    pub async fn new_local(path: &str) -> Result<Self> {
        Self::new(DatabaseConfig::local(path)).await
    }

    /// Create a new remote database connection to Turso
    pub async fn new_remote(url: String, auth_token: String) -> Result<Self> {
        Self::new(DatabaseConfig::remote(url, auth_token)).await
    }

    /// Create a new embedded replica (local copy synced with remote)
    pub async fn new_replica(local_path: &str, url: String, auth_token: String) -> Result<Self> {
        Self::new(DatabaseConfig::replica(local_path, url, auth_token)).await
    }

    /// Get a connection to the database.
    /// libsql may perform blocking setup internally, so we offload connect to a blocking thread.
    pub async fn connect(&self) -> Result<Connection> {
        let db = Arc::clone(&self.db);
        tokio::task::spawn_blocking(move || db.connect())
            .await
            .context("Database connection task failed")?
            .context("Failed to get database connection")
    }

    /// Sync the embedded replica with the remote database
    pub async fn sync(&self) -> Result<()> {
        self.db.sync().await.context("Failed to sync database")?;
        Ok(())
    }
}
