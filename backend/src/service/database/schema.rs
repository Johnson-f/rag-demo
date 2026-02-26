use anyhow::{Context, Result};
use libsql::Connection;
use tracing::{info, warn};

use super::migrations::{Migration, MIGRATIONS};

const SCHEMA_VERSION_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS schema_version (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)
"#;

pub struct SchemaManager {
    conn: Connection,
}

impl SchemaManager {
    pub fn new(conn: Connection) -> Self {
        Self { conn }
    }

    /// Initialize the schema version table
    async fn init_schema_version_table(&self) -> Result<()> {
        self.conn
            .execute(SCHEMA_VERSION_TABLE, ())
            .await
            .context("Failed to create schema_version table")?;

        // Insert initial version if not exists
        self.conn
            .execute(
                "INSERT OR IGNORE INTO schema_version (id, version) VALUES (1, 0)",
                (),
            )
            .await
            .context("Failed to initialize schema version")?;

        Ok(())
    }

    /// Get the current schema version from the database
    pub async fn get_current_version(&self) -> Result<i64> {
        let mut rows = self
            .conn
            .query("SELECT version FROM schema_version WHERE id = 1", ())
            .await
            .context("Failed to query schema version")?;

        if let Some(row) = rows.next().await? {
            let version: i64 = row.get(0)?;
            Ok(version)
        } else {
            Ok(0)
        }
    }

    /// Update the schema version in the database
    async fn update_version(&self, version: i64) -> Result<()> {
        self.conn
            .execute(
                "UPDATE schema_version SET version = ?1, applied_at = datetime('now') WHERE id = 1",
                libsql::params![version],
            )
            .await
            .context("Failed to update schema version")?;

        Ok(())
    }

    /// Run all pending migrations
    pub async fn migrate(&self) -> Result<()> {
        self.init_schema_version_table().await?;

        let current_version = self.get_current_version().await?;
        let target_version = MIGRATIONS.len() as i64;

        if current_version >= target_version {
            info!(
                "Schema is up to date (version {})",
                current_version
            );
            return Ok(());
        }

        info!(
            "Migrating schema from version {} to {}",
            current_version, target_version
        );

        // Apply migrations in order
        for migration in MIGRATIONS.iter() {
            if migration.version > current_version {
                self.apply_migration(migration).await?;
            }
        }

        info!("Migration completed successfully");
        Ok(())
    }

    /// Apply a single migration
    async fn apply_migration(&self, migration: &Migration) -> Result<()> {
        info!("Applying migration {}: {}", migration.version, migration.name);

        // Begin transaction
        let tx = self.conn.transaction().await?;

        // Execute migration
        for statement in migration.up {
            tx.execute(statement, ())
                .await
                .with_context(|| format!("Failed to execute migration statement: {}", statement))?;
        }

        // Update version
        tx.execute(
            "UPDATE schema_version SET version = ?1, applied_at = datetime('now') WHERE id = 1",
            libsql::params![migration.version],
        )
        .await?;

        // Commit transaction
        tx.commit().await?;

        info!("Migration {} applied successfully", migration.version);
        Ok(())
    }

    /// Rollback to a specific version (use with caution)
    pub async fn rollback_to(&self, target_version: i64) -> Result<()> {
        let current_version = self.get_current_version().await?;

        if target_version >= current_version {
            warn!("Target version is not lower than current version");
            return Ok(());
        }

        info!(
            "Rolling back schema from version {} to {}",
            current_version, target_version
        );

        // Apply rollbacks in reverse order
        for migration in MIGRATIONS.iter().rev() {
            if migration.version > target_version && migration.version <= current_version {
                self.rollback_migration(migration).await?;
            }
        }

        info!("Rollback completed successfully");
        Ok(())
    }

    /// Rollback a single migration
    async fn rollback_migration(&self, migration: &Migration) -> Result<()> {
        warn!("Rolling back migration {}: {}", migration.version, migration.name);

        let tx = self.conn.transaction().await?;

        for statement in migration.down {
            tx.execute(statement, ())
                .await
                .with_context(|| format!("Failed to execute rollback statement: {}", statement))?;
        }

        tx.execute(
            "UPDATE schema_version SET version = ?1, applied_at = datetime('now') WHERE id = 1",
            libsql::params![migration.version - 1],
        )
        .await?;

        tx.commit().await?;

        warn!("Migration {} rolled back", migration.version);
        Ok(())
    }
}
