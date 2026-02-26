# AI App Demo Project

This is a demo project that showcases two different approaches to building an AI app:

## Approach 1: Vector Database with Vector Embeddings

## Approach 2: Storing JSON in a SQL Database

## Getting Started

### Database Setup (Turso)

1. Install Turso CLI:
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

2. Create a database:
```bash
turso auth signup
turso db create my-database
turso db show --url my-database
turso db tokens create my-database
```

3. Configure environment:
```bash
cd backend
cp .env.example .env
# Edit .env with your Turso credentials
```

4. Run the application:
```bash
cargo run
```

See [backend/SETUP.md](backend/SETUP.md) for detailed instructions. 