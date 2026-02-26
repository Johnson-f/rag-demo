pub mod health;
pub mod users;
pub mod trade;
pub mod websocket;

use actix_web::web;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api")
            .configure(health::configure)
            .configure(users::configure)
            .configure(trade::configure)
            .configure(websocket::configure)
    );
}
