# Turso Database Setup Guide

## Prerequisites

1. Install the Turso CLI:
```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Or with Homebrew
brew install tursodatabase/tap/turso
```

2. Sign up and authenticate:
```bash
turso auth signup
# or if you already have an account
turso auth login
```

## Create a Turso Database

1. Create a new database:
```bash
turso db create my-database
```

2. Get your database URL:
```bash
turso db show --url my-database
```

3. Create an authentication token:
```bash
turso db tokens create my-database
```

## Configure Your Application

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:
```env
TURSO_DATABASE_URL=libsql://my-database-username.turso.io
TURSO_AUTH_TOKEN=eyJhbGc...your-token-here
```

## Connection Modes

The application automatically chooses the best connection mode:

### Embedded Replica (Default with Turso credentials)
- Local SQLite file synced with remote Turso database
- Fast reads from local file
- Writes go to remote and sync back
- Best for production

### Local Only (No Turso credentials)
- Pure local SQLite database
- No network required
- Best for development/testing

### Remote Only (Advanced)
- Direct connection to Turso
- Every query goes over network
- Use when you don't want local storage

## Run the Application

```bash
cargo run
```

The application will:
1. Load configuration from `.env`
2. Connect to the database
3. Run any pending migrations
4. Be ready to use!

## Useful Turso Commands

```bash
# List all databases
turso db list

# Open database shell
turso db shell my-database

# Show database info
turso db show my-database

# Delete a database
turso db destroy my-database

# List all tokens
turso db tokens list my-database

# Revoke a token
turso db tokens revoke my-database <token>
```

## Troubleshooting

### "Failed to create remote database connection"
- Check your `TURSO_DATABASE_URL` format (should start with `libsql://`)
- Verify your `TURSO_AUTH_TOKEN` is valid
- Ensure you have network connectivity

### "Failed to sync database"
- Check network connection
- Verify token hasn't expired
- Try recreating the token

### Local development without Turso
Simply don't set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in your `.env` file, and the app will use a local SQLite database.
