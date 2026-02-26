use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

use crate::service::database::DatabaseClient;

#[derive(Debug, Serialize, Deserialize)]
pub struct Document {
    pub id: Option<i64>,
    pub title: String,
    pub content: String,
    pub metadata: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateDocumentRequest {
    pub title: String,
    pub content: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocumentRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[get("/documents")]
async fn get_documents(db: web::Data<DatabaseClient>) -> impl Responder {
    let conn = match db.connect().await {
        Ok(conn) => conn,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database connection failed: {}", e)
        })),
    };

    let mut rows = match conn
        .query("SELECT id, title, content, metadata FROM documents ORDER BY id", ())
        .await
    {
        Ok(rows) => rows,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Query failed: {}", e)
        })),
    };

    let mut documents = Vec::new();
    while let Ok(Some(row)) = rows.next().await {
        let id: i64 = row.get(0).unwrap_or(0);
        let title: String = row.get(1).unwrap_or_default();
        let content: String = row.get(2).unwrap_or_default();
        let metadata: Option<String> = row.get(3).ok();

        documents.push(Document {
            id: Some(id),
            title,
            content,
            metadata,
        });
    }

    HttpResponse::Ok().json(documents)
}

#[get("/documents/{id}")]
async fn get_document(db: web::Data<DatabaseClient>, id: web::Path<i64>) -> impl Responder {
    let conn = match db.connect().await {
        Ok(conn) => conn,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database connection failed: {}", e)
        })),
    };

    let mut rows = match conn
        .query(
            "SELECT id, title, content, metadata FROM documents WHERE id = ?1",
            libsql::params![*id],
        )
        .await
    {
        Ok(rows) => rows,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Query failed: {}", e)
        })),
    };

    if let Ok(Some(row)) = rows.next().await {
        let id: i64 = row.get(0).unwrap_or(0);
        let title: String = row.get(1).unwrap_or_default();
        let content: String = row.get(2).unwrap_or_default();
        let metadata: Option<String> = row.get(3).ok();

        HttpResponse::Ok().json(Document {
            id: Some(id),
            title,
            content,
            metadata,
        })
    } else {
        HttpResponse::NotFound().json(serde_json::json!({
            "error": "Document not found"
        }))
    }
}

#[post("/documents")]
async fn create_document(
    db: web::Data<DatabaseClient>,
    doc: web::Json<CreateDocumentRequest>,
) -> impl Responder {
    let conn = match db.connect().await {
        Ok(conn) => conn,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database connection failed: {}", e)
        })),
    };

    let metadata_str = doc.metadata.as_ref().map(|m| m.to_string());

    match conn
        .execute(
            "INSERT INTO documents (title, content, metadata) VALUES (?1, ?2, ?3)",
            libsql::params![doc.title.clone(), doc.content.clone(), metadata_str.clone()],
        )
        .await
    {
        Ok(_) => {
            let mut rows = match conn.query("SELECT last_insert_rowid()", ()).await {
                Ok(rows) => rows,
                Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to get inserted ID: {}", e)
                })),
            };

            if let Ok(Some(row)) = rows.next().await {
                let id: i64 = row.get(0).unwrap_or(0);
                HttpResponse::Created().json(Document {
                    id: Some(id),
                    title: doc.title.clone(),
                    content: doc.content.clone(),
                    metadata: metadata_str,
                })
            } else {
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Failed to retrieve created document"
                }))
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Insert failed: {}", e)
        })),
    }
}

#[put("/documents/{id}")]
async fn update_document(
    db: web::Data<DatabaseClient>,
    id: web::Path<i64>,
    doc: web::Json<UpdateDocumentRequest>,
) -> impl Responder {
    let conn = match db.connect().await {
        Ok(conn) => conn,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database connection failed: {}", e)
        })),
    };

    let mut updates = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(title) = &doc.title {
        updates.push("title = ?");
        params.push(title.clone());
    }
    if let Some(content) = &doc.content {
        updates.push("content = ?");
        params.push(content.clone());
    }
    if let Some(metadata) = &doc.metadata {
        updates.push("metadata = ?");
        params.push(metadata.to_string());
    }

    if updates.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "No fields to update"
        }));
    }

    let query = format!(
        "UPDATE documents SET {}, updated_at = datetime('now') WHERE id = ?",
        updates.join(", ")
    );
    params.push(id.to_string());

    match conn.execute(&query, libsql::params_from_iter(params)).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Document updated successfully"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Update failed: {}", e)
        })),
    }
}

#[delete("/documents/{id}")]
async fn delete_document(db: web::Data<DatabaseClient>, id: web::Path<i64>) -> impl Responder {
    let conn = match db.connect().await {
        Ok(conn) => conn,
        Err(e) => return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Database connection failed: {}", e)
        })),
    };

    match conn
        .execute("DELETE FROM documents WHERE id = ?1", libsql::params![*id])
        .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Document deleted successfully"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Delete failed: {}", e)
        })),
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(get_documents)
        .service(get_document)
        .service(create_document)
        .service(update_document)
        .service(delete_document);
}
