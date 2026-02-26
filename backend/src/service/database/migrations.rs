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
    // Add more migrations here as your schema evolves
];
