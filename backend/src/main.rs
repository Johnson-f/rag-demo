mod service;
mod routes;
mod models;

use actix_web::{middleware, web, App, HttpServer};
use actix_cors::Cors;
use anyhow::Result;
use service::database::{DatabaseClient, DatabaseConfig, SchemaManager};
use service::ai_service::{TradeVectorService, TradeChatService};
use service::ai_service::chat_service::TradeStreamService;
use routes::trade::AppState;
use std::sync::Arc;

#[actix_web::main]
async fn main() -> Result<()> {
    // Fix rustls crypto provider conflict (aws-lc-rs vs ring both enabled transitively)
    rustls::crypto::aws_lc_rs::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

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

    // Initialize AI service
    println!("Initializing AI service...");
    let vector_service = match TradeVectorService::from_env().await {
        Ok(service) => {
            println!("✓ AI service initialized successfully!");
            service
        }
        Err(e) => {
            eprintln!("⚠ Warning: Failed to initialize AI service: {}", e);
            eprintln!("  The application will continue without vector search and AI insights.");
            eprintln!("  Make sure OPENROUTER_API_KEY and QDRANT_URL are set in .env");
            return Err(e);
        }
    };

    // Ensure the trades collection exists
    if let Err(e) = vector_service.ensure_collection().await {
        eprintln!("⚠ Warning: Failed to ensure trades collection: {}", e);
    }

    // Initialize chat service
    println!("Initializing chat service...");
    let chat_service = match TradeChatService::from_env(db.clone()).await {
        Ok(service) => {
            println!("✓ Chat service initialized successfully!");
            service
        }
        Err(e) => {
            eprintln!("⚠ Warning: Failed to initialize chat service: {}", e);
            eprintln!("  The application will continue without chat functionality.");
            return Err(e);
        }
    };

    // Initialize stream service
    println!("Initializing stream service...");
    let stream_service = match TradeStreamService::from_env(db.clone()).await {
        Ok(service) => {
            println!("✓ Stream service initialized successfully!");
            service
        }
        Err(e) => {
            eprintln!("⚠ Warning: Failed to initialize stream service: {}", e);
            eprintln!("  The application will continue without streaming functionality.");
            return Err(e);
        }
    };

    // Create app state with database, vector service, chat service, and stream service
    let app_state = web::Data::new(Arc::new(AppState {
        db,
        vector_service,
        chat_service,
        stream_service,
    }));

    // Start HTTP server
    let host = std::env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let bind_address = format!("{}:{}", host, port);

    println!("Starting server at http://{}", bind_address);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:3000")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![
                actix_web::http::header::AUTHORIZATION,
                actix_web::http::header::ACCEPT,
                actix_web::http::header::CONTENT_TYPE,
            ])
            .max_age(3600);

        App::new()
            .app_data(app_state.clone())
            .wrap(cors)
            .wrap(middleware::Logger::default())
            .wrap(middleware::Compress::default())
            .configure(routes::configure)
    })
    .bind(&bind_address)?
    .run()
    .await?;

    Ok(())
}