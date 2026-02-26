use actix_web::{web, HttpRequest, HttpResponse, Error};
use std::sync::Arc;

use crate::routes::trade::AppState;
use crate::service::websocket::TradeStreamWs;

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

/// Configure WebSocket routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.route("/ws/trades/chat", web::get().to(trade_stream_ws));
}
