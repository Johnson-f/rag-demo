use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::service::database::DatabaseClient;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TradeType {
    Long,
    Short,
}

impl TradeType {
    pub fn as_str(&self) -> &str {
        match self {
            TradeType::Long => "long",
            TradeType::Short => "short",
        }
    }

    pub fn from_str(s: &str) -> Result<Self> {
        match s.to_lowercase().as_str() {
            "long" => Ok(TradeType::Long),
            "short" => Ok(TradeType::Short),
            _ => anyhow::bail!("Invalid trade type: {}", s),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trade {
    pub id: Option<i64>,
    pub trade_id: String,
    pub stock_symbol: String,
    pub stock_name: String,
    pub entry_price: f64,
    pub exit_price: f64,
    pub trade_type: TradeType,
    pub stop_loss: Option<f64>,
    pub risk_reward: Option<f64>,
    pub profit: Option<f64>,
    pub profit_in_percent: Option<f64>,
    pub initial_target: Option<f64>,
    pub notes: Option<String>,
    pub trade_summary: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTradeInput {
    pub stock_symbol: String,
    pub stock_name: String,
    pub entry_price: f64,
    pub exit_price: f64,
    pub trade_type: TradeType,
    pub stop_loss: Option<f64>,
    pub initial_target: Option<f64>,
    pub notes: Option<String>,
}

impl Trade {
    /// Calculate risk/reward ratio
    /// Formula: (entry_price - stop_loss) / (exit_price - entry_price)
    pub fn calculate_risk_reward(
        entry_price: f64,
        exit_price: f64,
        stop_loss: Option<f64>,
    ) -> Option<f64> {
        stop_loss.map(|sl| {
            let risk = (entry_price - sl).abs();
            let reward = (exit_price - entry_price).abs();
            if reward == 0.0 {
                0.0
            } else {
                risk / reward
            }
        })
    }

    /// Calculate profit based on trade type
    /// Long: exit_price - entry_price
    /// Short: entry_price - exit_price
    pub fn calculate_profit(entry_price: f64, exit_price: f64, trade_type: &TradeType) -> f64 {
        match trade_type {
            TradeType::Long => exit_price - entry_price,
            TradeType::Short => entry_price - exit_price,
        }
    }

    /// Calculate profit percentage
    /// Formula: (profit / entry_price) * 100
    pub fn calculate_profit_percent(profit: f64, entry_price: f64) -> f64 {
        if entry_price == 0.0 {
            0.0
        } else {
            (profit / entry_price) * 100.0
        }
    }

    /// Generate a comprehensive trade summary for vectorization
    pub fn generate_trade_summary(
        stock_symbol: &str,
        stock_name: &str,
        entry_price: f64,
        exit_price: f64,
        trade_type: &TradeType,
        stop_loss: Option<f64>,
        risk_reward: Option<f64>,
        profit: Option<f64>,
        profit_in_percent: Option<f64>,
        initial_target: Option<f64>,
        notes: Option<&str>,
    ) -> String {
        let mut summary = format!(
            "{} trade on {} ({}) entered at ${:.2}, exited at ${:.2}",
            match trade_type {
                TradeType::Long => "Long",
                TradeType::Short => "Short",
            },
            stock_name,
            stock_symbol,
            entry_price,
            exit_price
        );

        if let Some(p) = profit {
            summary.push_str(&format!(" with ${:.2} profit", p));
        }

        if let Some(pp) = profit_in_percent {
            summary.push_str(&format!(" ({:.2}% return)", pp));
        }

        if let Some(sl) = stop_loss {
            summary.push_str(&format!(". Stop loss at ${:.2}", sl));
        }

        if let Some(rr) = risk_reward {
            summary.push_str(&format!(". Risk/reward ratio 1:{:.2}", 1.0 / rr));
        }

        if let Some(target) = initial_target {
            summary.push_str(&format!(". Initial target ${:.2}", target));
        }

        if let Some(n) = notes {
            if !n.is_empty() {
                summary.push_str(&format!(". Notes: {}", n));
            }
        }

        summary
    }

    /// Create a new trade from input with calculated fields
    pub fn from_input(input: CreateTradeInput) -> Self {
        let risk_reward = Self::calculate_risk_reward(
            input.entry_price,
            input.exit_price,
            input.stop_loss,
        );

        let profit = Self::calculate_profit(input.entry_price, input.exit_price, &input.trade_type);
        let profit_in_percent = Self::calculate_profit_percent(profit, input.entry_price);

        let trade_summary = Self::generate_trade_summary(
            &input.stock_symbol,
            &input.stock_name,
            input.entry_price,
            input.exit_price,
            &input.trade_type,
            input.stop_loss,
            risk_reward,
            Some(profit),
            Some(profit_in_percent),
            input.initial_target,
            input.notes.as_deref(),
        );

        Self {
            id: None,
            trade_id: Uuid::new_v4().to_string(),
            stock_symbol: input.stock_symbol,
            stock_name: input.stock_name,
            entry_price: input.entry_price,
            exit_price: input.exit_price,
            trade_type: input.trade_type,
            stop_loss: input.stop_loss,
            risk_reward,
            profit: Some(profit),
            profit_in_percent: Some(profit_in_percent),
            initial_target: input.initial_target,
            notes: input.notes,
            trade_summary: Some(trade_summary),
            created_at: None,
            updated_at: None,
        }
    }

    /// Insert a new trade into the database
    pub async fn insert(&self, db: &DatabaseClient) -> Result<i64> {
        let conn = db.connect().await?;

        let stmt = conn
            .prepare(
                r#"
                INSERT INTO stocks_trade (
                    trade_id, stock_symbol, stock_name, entry_price, exit_price,
                    trade_type, stop_loss, risk_reward, profit, profit_in_percent,
                    initial_target, notes, trade_summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .await
            .context("Failed to prepare insert statement")?;

        stmt.execute([
            &self.trade_id,
            &self.stock_symbol,
            &self.stock_name,
            &self.entry_price.to_string(),
            &self.exit_price.to_string(),
            self.trade_type.as_str(),
            &self.stop_loss.map(|v| v.to_string()).unwrap_or_default(),
            &self.risk_reward.map(|v| v.to_string()).unwrap_or_default(),
            &self.profit.map(|v| v.to_string()).unwrap_or_default(),
            &self.profit_in_percent.map(|v| v.to_string()).unwrap_or_default(),
            &self.initial_target.map(|v| v.to_string()).unwrap_or_default(),
            &self.notes.as_deref().unwrap_or(""),
            &self.trade_summary.as_deref().unwrap_or(""),
        ])
        .await
        .context("Failed to insert trade")?;

        Ok(conn.last_insert_rowid())
    }

    /// Get a trade by ID
    pub async fn get_by_id(db: &DatabaseClient, id: i64) -> Result<Option<Self>> {
        let conn = db.connect().await?;

        let stmt = conn
            .prepare("SELECT * FROM stocks_trade WHERE id = ?")
            .await
            .context("Failed to prepare select statement")?;

        let mut rows = stmt.query([id]).await.context("Failed to query trade")?;

        if let Some(row) = rows.next().await? {
            Ok(Some(Self::from_row(&row)?))
        } else {
            Ok(None)
        }
    }

    /// Get a trade by trade_id (UUID)
    pub async fn get_by_trade_id(db: &DatabaseClient, trade_id: &str) -> Result<Option<Self>> {
        let conn = db.connect().await?;

        let stmt = conn
            .prepare("SELECT * FROM stocks_trade WHERE trade_id = ?")
            .await
            .context("Failed to prepare select statement")?;

        let mut rows = stmt
            .query([trade_id])
            .await
            .context("Failed to query trade")?;

        if let Some(row) = rows.next().await? {
            Ok(Some(Self::from_row(&row)?))
        } else {
            Ok(None)
        }
    }

    /// Get all trades
    pub async fn get_all(db: &DatabaseClient) -> Result<Vec<Self>> {
        let conn = db.connect().await?;

        let stmt = conn
            .prepare("SELECT * FROM stocks_trade ORDER BY created_at DESC")
            .await
            .context("Failed to prepare select statement")?;

        let mut rows = stmt.query(()).await.context("Failed to query trades")?;

        let mut trades = Vec::new();
        while let Some(row) = rows.next().await? {
            trades.push(Self::from_row(&row)?);
        }

        Ok(trades)
    }

    /// Get trades by stock symbol
    pub async fn get_by_symbol(db: &DatabaseClient, symbol: &str) -> Result<Vec<Self>> {
        let conn = db.connect().await?;

        let stmt = conn
            .prepare("SELECT * FROM stocks_trade WHERE stock_symbol = ? ORDER BY created_at DESC")
            .await
            .context("Failed to prepare select statement")?;

        let mut rows = stmt.query([symbol]).await.context("Failed to query trades")?;

        let mut trades = Vec::new();
        while let Some(row) = rows.next().await? {
            trades.push(Self::from_row(&row)?);
        }

        Ok(trades)
    }

    /// Update a trade
    pub async fn update(&self, db: &DatabaseClient) -> Result<()> {
        let conn = db.connect().await?;

        let stmt = conn
            .prepare(
                r#"
                UPDATE stocks_trade SET
                    stock_symbol = ?, stock_name = ?, entry_price = ?, exit_price = ?,
                    trade_type = ?, stop_loss = ?, risk_reward = ?, profit = ?,
                    profit_in_percent = ?, initial_target = ?, notes = ?, trade_summary = ?,
                    updated_at = datetime('now')
                WHERE trade_id = ?
                "#,
            )
            .await
            .context("Failed to prepare update statement")?;

        stmt.execute([
            &self.stock_symbol,
            &self.stock_name,
            &self.entry_price.to_string(),
            &self.exit_price.to_string(),
            self.trade_type.as_str(),
            &self.stop_loss.map(|v| v.to_string()).unwrap_or_default(),
            &self.risk_reward.map(|v| v.to_string()).unwrap_or_default(),
            &self.profit.map(|v| v.to_string()).unwrap_or_default(),
            &self.profit_in_percent.map(|v| v.to_string()).unwrap_or_default(),
            &self.initial_target.map(|v| v.to_string()).unwrap_or_default(),
            &self.notes.as_deref().unwrap_or(""),
            &self.trade_summary.as_deref().unwrap_or(""),
            &self.trade_id,
        ])
        .await
        .context("Failed to update trade")?;

        Ok(())
    }

    /// Delete a trade by trade_id
    pub async fn delete(db: &DatabaseClient, trade_id: &str) -> Result<()> {
        let conn = db.connect().await?;

        let stmt = conn
            .prepare("DELETE FROM stocks_trade WHERE trade_id = ?")
            .await
            .context("Failed to prepare delete statement")?;

        stmt.execute([trade_id])
            .await
            .context("Failed to delete trade")?;

        Ok(())
    }

    /// Helper to parse a row into a Trade
    fn from_row(row: &libsql::Row) -> Result<Self> {
        Ok(Self {
            id: Some(row.get(0)?),
            trade_id: row.get(1)?,
            stock_symbol: row.get(2)?,
            stock_name: row.get(3)?,
            entry_price: row.get::<f64>(4)?,
            exit_price: row.get::<f64>(5)?,
            trade_type: TradeType::from_str(&row.get::<String>(6)?)?,
            stop_loss: row.get::<Option<f64>>(7)?,
            risk_reward: row.get::<Option<f64>>(8)?,
            profit: row.get::<Option<f64>>(9)?,
            profit_in_percent: row.get::<Option<f64>>(10)?,
            initial_target: row.get::<Option<f64>>(11)?,
            notes: row.get::<Option<String>>(12)?,
            trade_summary: row.get::<Option<String>>(13)?,
            created_at: Some(row.get(14)?),
            updated_at: Some(row.get(15)?),
        })
    }
}
