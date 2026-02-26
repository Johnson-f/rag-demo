/// Represents a database migration
pub struct Migration {
    pub version: i64,
    pub name: &'static str,
    pub up: &'static [&'static str],
    pub down: &'static [&'static str],
}

/// All migrations in order
pub const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "create_users_table",
        up: &[
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                name TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        ],
        down: &[
            "DROP INDEX IF EXISTS idx_users_email",
            "DROP TABLE IF EXISTS users",
        ],
    },
    Migration {
        version: 2,
        name: "create_documents_table",
        up: &[
            r#"
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
            "CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title)",
        ],
        down: &[
            "DROP INDEX IF EXISTS idx_documents_title",
            "DROP TABLE IF EXISTS documents",
        ],
    },
    Migration {
        version: 3,
        name: "drop_documents_table",
        up: &[
            "DROP INDEX IF EXISTS idx_documents_title",
            "DROP TABLE IF EXISTS documents",
        ],
        down: &[
            r#"
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
            "CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title)",
        ],
    },
    Migration {
        version: 4,
        name: "create_stocks_trade_table",
        up: &[
            r#"
            CREATE TABLE IF NOT EXISTS stocks_trade (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trade_id TEXT NOT NULL UNIQUE,
                stock_symbol TEXT NOT NULL,
                stock_name TEXT NOT NULL,
                entry_price REAL NOT NULL,
                exit_price REAL NOT NULL,
                trade_type TEXT NOT NULL CHECK(trade_type IN ('short', 'long')),
                stop_loss REAL NOT NULL,
                risk_reward REAL,
                profit REAL,
                profit_in_percent REAL,
                initial_target REAL,
                notes TEXT,
                trade_summary TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            "#,
            "CREATE INDEX IF NOT EXISTS idx_stocks_trade_trade_id ON stocks_trade(trade_id)",
            "CREATE INDEX IF NOT EXISTS idx_stocks_trade_stock_symbol ON stocks_trade(stock_symbol)",
            "CREATE INDEX IF NOT EXISTS idx_stocks_trade_trade_type ON stocks_trade(trade_type)",
            "CREATE INDEX IF NOT EXISTS idx_stocks_trade_created_at ON stocks_trade(created_at)",
        ],
        down: &[
            "DROP INDEX IF EXISTS idx_stocks_trade_created_at",
            "DROP INDEX IF EXISTS idx_stocks_trade_trade_type",
            "DROP INDEX IF EXISTS idx_stocks_trade_stock_symbol",
            "DROP INDEX IF EXISTS idx_stocks_trade_trade_id",
            "DROP TABLE IF EXISTS stocks_trade",
        ],
    },
    // Add more migrations here as your schema evolves
    
];
