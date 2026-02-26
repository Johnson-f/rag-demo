# Database Service

This module provides a robust database connection and schema migration system using Turso/libsql.

## Quick Start

1. Set up Turso (see [SETUP.md](../../../SETUP.md))
2. Configure `.env` with your credentials:
```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```
3. Run the app - migrations happen automatically!

## Features

- Automatic configuration from environment variables
- Multiple connection modes (local, remote, embedded replica)
- Automatic schema versioning and migrations
- Transaction-based migrations for safety
- Rollback support
- SQLite best practices

## Usage

### 1. Initialize Database (Automatic)

```rust
use service::database::{DatabaseClient, DatabaseConfig, SchemaManager};

// Load from environment variables
let config = DatabaseConfig::from_env()?;
let db = DatabaseClient::new(config).await?;
```

### 2. Manual Configuration

```rust
// Local database
let config = DatabaseConfig::local("local.db");

// Remote Turso database
let config = DatabaseConfig::remote(
    "libsql://your-database.turso.io",
    "your-auth-token",
);

// Embedded replica (recommended)
let config = DatabaseConfig::replica(
    "local-replica.db",
    "libsql://your-database.turso.io",
    "your-auth-token",
);

let db = DatabaseClient::new(config).await?;
```

### 3. Run Migrations

```rust
let conn = db.connect()?;
let schema_manager = SchemaManager::new(conn);
schema_manager.migrate().await?;
```

### 4. Add New Migrations

Edit `migrations.rs` and add a new migration to the `MIGRATIONS` array:

```rust
Migration {
    version: 3,
    name: "add_user_role",
    up: vec![
        "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'",
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
    ],
    down: vec![
        "DROP INDEX IF EXISTS idx_users_role",
        "ALTER TABLE users DROP COLUMN role",
    ],
},
```

## Connection Modes

### Embedded Replica (Default)
When you provide Turso credentials, the app uses an embedded replica:
- Local SQLite file for fast reads
- Automatic sync with remote Turso database
- Best for production

### Local Only
Without Turso credentials, uses pure local SQLite:
- No network required
- Perfect for development

### Remote Only
Direct connection to Turso (advanced use case):
```rust
let config = DatabaseConfig::remote(url, token);
```

## Environment Variables

```env
# Required for Turso connection
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# Optional
REPLICA_DB_PATH=local-replica.db  # Default: local-replica.db
LOCAL_DB_PATH=local.db            # Default: local.db
```

## SQLite Best Practices

This implementation follows SQLite best practices:

1. **Use transactions** - All migrations run in transactions
2. **Indexes on foreign keys** - Indexes created for commonly queried columns
3. **Use INTEGER PRIMARY KEY** - Leverages SQLite's rowid optimization
4. **Use TEXT for timestamps** - ISO 8601 format with datetime('now')
5. **Avoid NULL when possible** - Use DEFAULT values
6. **Use AUTOINCREMENT sparingly** - Only when necessary
7. **Create indexes for queries** - Indexes on email, title, etc.

## Getting Turso Credentials

```bash
# Get database URL
turso db show --url <database-name>

# Create auth token
turso db tokens create <database-name>
```

See [SETUP.md](../../../SETUP.md) for detailed setup instructions.
