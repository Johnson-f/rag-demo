use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::models::{CreateTradeInput, Trade};
use crate::service::database::DatabaseClient;
use crate::service::ai_service::{TradeVectorService, TradeChatService};
use crate::service::ai_service::chat_service::TradeStreamService;

/// Application state containing database and vector service clients
pub struct AppState {
    pub db: DatabaseClient,
    pub vector_service: TradeVectorService,
    pub chat_service: TradeChatService,
    pub stream_service: TradeStreamService,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

#[derive(Serialize)]
struct SuccessResponse {
    message: String,
    trade_id: Option<String>,
}

#[derive(Deserialize)]
struct SearchQuery {
    q: String,
    #[serde(default = "default_limit")]
    limit: usize,
}

fn default_limit() -> usize {
    10
}

/// POST /trades - Create a new trade
#[post("/trades")]
async fn create_trade(
    data: web::Data<Arc<AppState>>,
    input: web::Json<CreateTradeInput>,
) -> impl Responder {
    // Create trade from input with calculated fields
    let trade = Trade::from_input(input.into_inner());

    // Insert into database
    match trade.insert(&data.db).await {
        Ok(_) => {
            // Store in vector database
            match data.vector_service.create(&trade).await {
                Ok(_) => {
                    tracing::info!("Trade {} stored in vector database", trade.trade_id);
                    HttpResponse::Created().json(trade)
                }
                Err(e) => {
                    tracing::error!("Failed to store trade in vector DB: {}", e);
                    // Trade is still in SQL DB, so return success but log the error
                    HttpResponse::Created().json(trade)
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to create trade: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to create trade: {}", e),
            })
        }
    }
}

/// GET /trades - Get all trades
#[get("/trades")]
async fn get_all_trades(data: web::Data<Arc<AppState>>) -> impl Responder {
    match Trade::get_all(&data.db).await {
        Ok(trades) => HttpResponse::Ok().json(trades),
        Err(e) => {
            tracing::error!("Failed to get trades: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to get trades: {}", e),
            })
        }
    }
}

/// GET /trades/{trade_id} - Get a specific trade by trade_id (UUID)
#[get("/trades/{trade_id}")]
async fn get_trade(
    data: web::Data<Arc<AppState>>,
    trade_id: web::Path<String>,
) -> impl Responder {
    match Trade::get_by_trade_id(&data.db, &trade_id).await {
        Ok(Some(trade)) => HttpResponse::Ok().json(trade),
        Ok(None) => HttpResponse::NotFound().json(ErrorResponse {
            error: "Trade not found".to_string(),
        }),
        Err(e) => {
            tracing::error!("Failed to get trade: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to get trade: {}", e),
            })
        }
    }
}

/// GET /trades/symbol/{symbol} - Get trades by stock symbol
#[get("/trades/symbol/{symbol}")]
async fn get_trades_by_symbol(
    data: web::Data<Arc<AppState>>,
    symbol: web::Path<String>,
) -> impl Responder {
    match Trade::get_by_symbol(&data.db, &symbol).await {
        Ok(trades) => HttpResponse::Ok().json(trades),
        Err(e) => {
            tracing::error!("Failed to get trades by symbol: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to get trades: {}", e),
            })
        }
    }
}

/// PUT /trades/{trade_id} - Update a trade
#[put("/trades/{trade_id}")]
async fn update_trade(
    data: web::Data<Arc<AppState>>,
    trade_id: web::Path<String>,
    input: web::Json<CreateTradeInput>,
) -> impl Responder {
    // Get existing trade
    let existing_trade = match Trade::get_by_trade_id(&data.db, &trade_id).await {
        Ok(Some(trade)) => trade,
        Ok(None) => {
            return HttpResponse::NotFound().json(ErrorResponse {
                error: "Trade not found".to_string(),
            })
        }
        Err(e) => {
            tracing::error!("Failed to get trade: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to get trade: {}", e),
            });
        }
    };

    // Create updated trade with new values but keep the same trade_id
    let mut updated_trade = Trade::from_input(input.into_inner());
    updated_trade.trade_id = existing_trade.trade_id;
    updated_trade.id = existing_trade.id;
    updated_trade.created_at = existing_trade.created_at;

    // Update in database
    match updated_trade.update(&data.db).await {
        Ok(_) => {
            // Update in vector database
            match data.vector_service.update(&updated_trade).await {
                Ok(_) => {
                    tracing::info!("Trade {} updated in vector database", updated_trade.trade_id);
                    HttpResponse::Ok().json(updated_trade)
                }
                Err(e) => {
                    tracing::error!("Failed to update trade in vector DB: {}", e);
                    // Trade is updated in SQL DB, so return success but log the error
                    HttpResponse::Ok().json(updated_trade)
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to update trade: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to update trade: {}", e),
            })
        }
    }
}

/// DELETE /trades/{trade_id} - Delete a trade
#[delete("/trades/{trade_id}")]
async fn delete_trade(
    data: web::Data<Arc<AppState>>,
    trade_id: web::Path<String>,
) -> impl Responder {
    // Delete from database
    match Trade::delete(&data.db, &trade_id).await {
        Ok(_) => {
            // Delete from vector database
            match data.vector_service.delete(&trade_id).await {
                Ok(_) => {
                    tracing::info!("Trade {} deleted from vector database", trade_id);
                    HttpResponse::Ok().json(SuccessResponse {
                        message: "Trade deleted successfully".to_string(),
                        trade_id: Some(trade_id.to_string()),
                    })
                }
                Err(e) => {
                    tracing::error!("Failed to delete trade from vector DB: {}", e);
                    // Trade is deleted from SQL DB, so return success but log the error
                    HttpResponse::Ok().json(SuccessResponse {
                        message: "Trade deleted successfully".to_string(),
                        trade_id: Some(trade_id.to_string()),
                    })
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete trade: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to delete trade: {}", e),
            })
        }
    }
}

/// GET /trades/search?q=query&limit=10 - Semantic search for similar trades
#[get("/trades/search")]
async fn search_trades(
    data: web::Data<Arc<AppState>>,
    query: web::Query<SearchQuery>,
) -> impl Responder {
    match data
        .vector_service
        .search_similar(&query.q, query.limit)
        .await
    {
        Ok(trades) => HttpResponse::Ok().json(trades),
        Err(e) => {
            tracing::error!("Failed to search trades: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to search trades: {}", e),
            })
        }
    }
}

/// POST /trades/insights - Get AI insights about trades (legacy endpoint)
#[post("/trades/insights")]
async fn get_trade_insights(
    data: web::Data<Arc<AppState>>,
    query: web::Json<serde_json::Value>,
) -> impl Responder {
    let question = match query.get("question").and_then(|v| v.as_str()) {
        Some(q) => q,
        None => {
            return HttpResponse::BadRequest().json(ErrorResponse {
                error: "Missing 'question' field".to_string(),
            })
        }
    };

    match data.vector_service.get_insights(question).await {
        Ok(insights) => HttpResponse::Ok().json(serde_json::json!({
            "question": question,
            "insights": insights
        })),
        Err(e) => {
            tracing::error!("Failed to get trade insights: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to get insights: {}", e),
            })
        }
    }
}

/// POST /trades/chat - Chat with AI about your trades using RAG
#[post("/trades/chat")]
async fn chat_about_trades(
    data: web::Data<Arc<AppState>>,
    request: web::Json<crate::service::ai_service::TradeChatRequest>,
) -> impl Responder {
    match data.chat_service.chat(request.into_inner()).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(e) => {
            tracing::error!("Failed to process chat request: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to process chat: {}", e),
            })
        }
    }
}

/// GET /trades/summary - Get portfolio summary statistics
#[get("/trades/summary")]
async fn get_portfolio_summary(data: web::Data<Arc<AppState>>) -> impl Responder {
    match data.chat_service.get_portfolio_summary().await {
        Ok(summary) => HttpResponse::Ok().json(serde_json::json!({
            "summary": summary
        })),
        Err(e) => {
            tracing::error!("Failed to get portfolio summary: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to get summary: {}", e),
            })
        }
    }
}

/// Configure trade routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(create_trade)
        .service(get_all_trades)
        .service(get_trade)
        .service(get_trades_by_symbol)
        .service(update_trade)
        .service(delete_trade)
        .service(search_trades)
        .service(get_trade_insights)
        .service(chat_about_trades)
        .service(get_portfolio_summary);
}
