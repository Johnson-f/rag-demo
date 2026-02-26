mod service;
mod routes;

use actix_web::{middleware, web, App, HttpServer};
use anyhow::Result;
use service::database::{DatabaseClient, DatabaseConfig, SchemaManager};

#[actix_web::main]
async fn main() -> Result<()> {
    // Load environment variables from .env file
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Load database configuration from environment
    let config = DatabaseConfig::from_env()?;
    
    println!("Connecting to database...");
    let db = DatabaseClient::new(config).await?;

    // Get a connection and run migrations
    let conn = db.connect().await?;
    println!("Running migrations...");
    let schema_manager = SchemaManager::new(conn);
    schema_manager.migrate().await?;
    println!("✓ Database initialized and migrations applied successfully!");

    // Clone db for use in server
    let db_data = web::Data::new(db);

    // Start HTTP server
    let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let bind_address = format!("{}:{}", host, port);

    println!("Starting server at http://{}", bind_address);

    HttpServer::new(move || {
        App::new()
            .app_data(db_data.clone())
            .wrap(middleware::Logger::default())
            .wrap(middleware::Compress::default())
            .configure(routes::configure)
    })
    .bind(&bind_address)?
    .run()
    .await?;

    Ok(())
}
