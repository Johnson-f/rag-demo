use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

use crate::service::database::DatabaseClient;

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: Option<i64>,
    pub email: String,
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub email: Option<String>,
    pub name: Option<String>,
}

#[get("/users")]
async fn get_users(db: web::Data<DatabaseClient>) -> impl Responder {
    let conn = match db.connect().await {
        Ok(conn) => conn,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database connection failed: {}", e)
        })),
    };

    let mut rows = match conn.query("SELECT id, email, name FROM users ORDER BY id", ()).await {
        Ok(rows) => rows,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Query failed: {}", e)
        })),
    };

    let mut users = Vec::new();
    while let Ok(Some(row)) = rows.next().await {
        let id: i64 = row.get(0).unwrap_or(0);
        let email: String = row.get(1).unwrap_or_default();
        let name: Option<String> = row.get(2).ok();

        users.push(User {
            id: Some(id),
            email,
            name,
        });
    }

    HttpResponse::Ok().json(users)
}

#[get("/users/{id}")]
async fn get_user(db: web::Data<DatabaseClient>, id: web::Path<i64>) -> impl Responder {
    let conn = match db.connect().await {
        Ok(conn) => conn,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database connection failed: {}", e)
        })),
    };

    let mut rows = match conn
        .query("SELECT id, email, name FROM users WHERE id = ?1", libsql::params![*id])
        .await
    {
        Ok(rows) => rows,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Query failed: {}", e)
        })),
    };

    if let Ok(Some(row)) = rows.next().await {
        let id: i64 = row.get(0).unwrap_or(0);
        let email: String = row.get(1).unwrap_or_default();
        let name: Option<String> = row.get(2).ok();

        HttpResponse::Ok().json(User {
            id: Some(id),
            email,
            name,
        })
    } else {
        HttpResponse::NotFound().json(serde_json::json!({
            "error": "User not found"
        }))
    }
}

#[post("/users")]
async fn create_user(
    db: web::Data<DatabaseClient>,
    user: web::Json<CreateUserRequest>,
) -> impl Responder {
    let conn = match db.connect().await {
        Ok(conn) => conn,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database connection failed: {}", e)
        })),
    };

    match conn
        .execute(
            "INSERT INTO users (email, name) VALUES (?1, ?2)",
            libsql::params![user.email.clone(), user.name.clone()],
        )
        .await
    {
        Ok(_) => {
            // Get the last inserted ID
            let mut rows = match conn.query("SELECT last_insert_rowid()", ()).await {
                Ok(rows) => rows,
                Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to get inserted ID: {}", e)
                })),
            };

            if let Ok(Some(row)) = rows.next().await {
                let id: i64 = row.get(0).unwrap_or(0);
                HttpResponse::Created().json(User {
                    id: Some(id),
                    email: user.email.clone(),
                    name: user.name.clone(),
                })
            } else {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Failed to retrieve created user"
                }))
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Insert failed: {}", e)
        })),
    }
}

#[put("/users/{id}")]
async fn update_user(
    db: web::Data<DatabaseClient>,
    id: web::Path<i64>,
    user: web::Json<UpdateUserRequest>,
) -> impl Responder {
    let conn = match db.connect().await {
        Ok(conn) => conn,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database connection failed: {}", e)
        })),
    };

    // Build dynamic update query
    let mut updates = Vec::new();
    let mut params = Vec::new();

    if let Some(email) = &user.email {
        updates.push("email = ?");
        params.push(email.clone());
    }
    if let Some(name) = &user.name {
        updates.push("name = ?");
        params.push(name.clone());
    }

    if updates.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "No fields to update"
        }));
    }

    let query = format!(
        "UPDATE users SET {}, updated_at = datetime('now') WHERE id = ?",
        updates.join(", ")
    );
    params.push(id.to_string());

    match conn.execute(&query, libsql::params_from_iter(params)).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "User updated successfully"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Update failed: {}", e)
        })),
    }
}

#[delete("/users/{id}")]
async fn delete_user(db: web::Data<DatabaseClient>, id: web::Path<i64>) -> impl Responder {
    let conn = match db.connect().await {
        Ok(conn) => conn,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database connection failed: {}", e)
        })),
    };

    match conn
        .execute("DELETE FROM users WHERE id = ?1", libsql::params![*id])
        .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "User deleted successfully"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Delete failed: {}", e)
        })),
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(get_users)
        .service(get_user)
        .service(create_user)
        .service(update_user)
        .service(delete_user);
}
