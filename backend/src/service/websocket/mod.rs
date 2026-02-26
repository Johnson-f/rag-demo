use actix_ws::{Message, MessageStream, Session};
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;

use crate::routes::trade::AppState;
use crate::service::ai_service::chat_service::StreamChunk;

/// WebSocket message types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WsMessage {
    /// Client sends a chat message
    Chat { message: String, context_limit: Option<usize> },
    /// Server sends a text chunk
    TextChunk { content: String },
    /// Server sends completion signal
    Complete { total_chunks: usize },
    /// Error message
    Error { error: String },
    /// Ping/Pong for keepalive
    Ping,
    Pong,
}

/// WebSocket handler for trade chat streams
pub struct TradeStreamWs {
    /// Application state with services
    app_state: Arc<AppState>,
    /// WebSocket session
    session: Session,
    /// Message stream from client
    msg_stream: MessageStream,
}

impl TradeStreamWs {
    pub fn new(app_state: Arc<AppState>, session: Session, msg_stream: MessageStream) -> Self {
        Self {
            app_state,
            session,
            msg_stream,
        }
    }

    /// Main loop to handle WebSocket messages
    pub async fn run(mut self) {
        let mut last_heartbeat = tokio::time::Instant::now();
        let mut heartbeat_interval = tokio::time::interval(Duration::from_secs(5));

        loop {
            tokio::select! {
                // Handle heartbeat
                _ = heartbeat_interval.tick() => {
                    // Check if client is still alive
                    if last_heartbeat.elapsed() > Duration::from_secs(10) {
                        tracing::warn!("WebSocket client heartbeat failed, disconnecting");
                        let _ = self.session.close(None).await;
                        break;
                    }

                    if self.session.ping(b"").await.is_err() {
                        break;
                    }
                }

                // Handle incoming messages
                Some(msg) = self.msg_stream.next() => {
                    match msg {
                        Ok(Message::Text(text)) => {
                            last_heartbeat = tokio::time::Instant::now();
                            
                            if let Err(e) = self.handle_text_message(text.to_string()).await {
                                tracing::error!("Error handling message: {}", e);
                                let error_msg = WsMessage::Error {
                                    error: format!("Failed to process message: {}", e),
                                };
                                let _ = self.send_message(error_msg).await;
                            }
                        }
                        Ok(Message::Ping(bytes)) => {
                            last_heartbeat = tokio::time::Instant::now();
                            let _ = self.session.pong(&bytes).await;
                        }
                        Ok(Message::Pong(_)) => {
                            last_heartbeat = tokio::time::Instant::now();
                        }
                        Ok(Message::Close(reason)) => {
                            tracing::info!("WebSocket close requested: {:?}", reason);
                            let _ = self.session.close(reason).await;
                            break;
                        }
                        Ok(Message::Binary(_)) => {
                            tracing::warn!("Binary messages not supported");
                        }
                        Ok(_) => {}
                        Err(e) => {
                            tracing::error!("WebSocket error: {}", e);
                            break;
                        }
                    }
                }

                else => break,
            }
        }

        tracing::info!("WebSocket connection closed");
    }

    /// Handle incoming text message
    async fn handle_text_message(&mut self, text: String) -> Result<(), Box<dyn std::error::Error>> {
        // Parse incoming message
        let ws_msg: WsMessage = serde_json::from_str(&text)?;

        match ws_msg {
            WsMessage::Chat { message, context_limit } => {
                let limit = context_limit.unwrap_or(5);
                self.handle_chat_message(message, limit).await?;
            }
            WsMessage::Ping => {
                let pong_msg = WsMessage::Pong;
                self.send_message(pong_msg).await?;
            }
            _ => {
                tracing::warn!("Unexpected message type from client");
            }
        }

        Ok(())
    }

    /// Handle chat message and stream response
    async fn handle_chat_message(&mut self, message: String, context_limit: usize) -> Result<(), Box<dyn std::error::Error>> {
        // Get the streaming response from the AI service
        let mut stream = self.app_state.stream_service.stream_chat(message, context_limit).await?;

        // Stream chunks to the client
        while let Some(chunk) = stream.next().await {
            match chunk {
                StreamChunk::Text(text) => {
                    if !text.is_empty() {
                        let msg = WsMessage::TextChunk { content: text };
                        self.send_message(msg).await?;
                    }
                }
                StreamChunk::Done => {
                    let complete_msg = WsMessage::Complete { total_chunks: 0 };
                    self.send_message(complete_msg).await?;
                    break;
                }
                StreamChunk::Error(error) => {
                    let error_msg = WsMessage::Error { error };
                    self.send_message(error_msg).await?;
                    break;
                }
            }
        }

        // Send completion signal
        let complete_msg = WsMessage::Complete { total_chunks: 0 };
        self.send_message(complete_msg).await?;

        Ok(())
    }

    /// Send a message to the client
    async fn send_message(&mut self, msg: WsMessage) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string(&msg)?;
        self.session.text(json).await?;
        Ok(())
    }
}
