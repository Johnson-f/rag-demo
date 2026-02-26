pub mod health;
pub mod users;
pub mod documents;

use actix_web::web;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api")
            .configure(health::configure)
            .configure(users::configure)
            .configure(documents::configure)
    );
}
