#!/bin/bash

# Server startup script for the RAG demo backend
# This script runs the Rust backend with full backtrace enabled for debugging

set -e  # Exit on error

echo "🚀 Starting RAG Demo Backend Server..."
echo ""

# Change to backend directory
cd backend

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found in backend directory"
    echo "   Please create one based on .env.example"
    echo ""
fi

# Export environment variables for better debugging
export RUST_BACKTRACE=full
export RUST_LOG=info

echo "📝 Environment:"
echo "   RUST_BACKTRACE=full"
echo "   RUST_LOG=info"
echo ""

# Run the server
echo "🔧 Building and running server..."
echo ""

cargo run

# Note: The server will continue running until you press Ctrl+C
