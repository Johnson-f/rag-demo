use actix_web::{web, HttpRequest, HttpResponse, Error};
use std::sync::Arc;

use crate::routes::trade::AppState;
use crate::service::websocket::{TradeStreamWs, MultiStepStreamWs};

/// WebSocket endpoint for streaming trade chat
pub async fn trade_stream_ws(
    req: HttpRequest,
    body: web::Payload,
    data: web::Data<Arc<AppState>>,
) -> Result<HttpResponse, Error> {
    tracing::info!("New WebSocket connection request");
    
    let (response, session, msg_stream) = actix_ws::handle(&req, body)?;
    
    let ws_handler = TradeStreamWs::new(data.get_ref().clone(), session, msg_stream);
    
    // Spawn the WebSocket handler task
    actix_web::rt::spawn(async move {
        ws_handler.run().await;
    });
    
    Ok(response)
}

/// WebSocket endpoint for streaming multi-step analysis
pub async fn multi_step_stream_ws(
    req: HttpRequest,
    body: web::Payload,
    data: web::Data<Arc<AppState>>,
) -> Result<HttpResponse, Error> {
    tracing::info!("New multi-step WebSocket connection request");
    
    let (response, session, msg_stream) = actix_ws::handle(&req, body)?;
    
    let ws_handler = MultiStepStreamWs::new(data.get_ref().clone(), session, msg_stream);
    
    // Spawn the WebSocket handler task
    actix_web::rt::spawn(async move {
        ws_handler.run().await;
    });
    
    Ok(response)
}

/// Configure WebSocket routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.route("/ws/trades/chat", web::get().to(trade_stream_ws))
       .route("/ws/trades/analyze", web::get().to(multi_step_stream_ws));
}
