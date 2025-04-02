#!/bin/bash

# This script is designed to run the inventory MCP server properly for Claude Desktop

# Kill any existing processes on ports 8000 and 8001 more aggressively
echo "Killing any existing processes on ports 8000 and 8001..." >&2
pkill -f "deno.*:800[01]" || true
lsof -i :8000 -i :8001 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
sleep 1

# Set up environment
export PORT=8001
export POSTGRES_USER=marcelssl
export POSTGRES_PASSWORD=marcelssl
export POSTGRES_DB=inventory
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export DEBUG=true

# Change to project directory
cd /Users/marcelssl/inventory_mcp

# Use absolute path to Deno
DENO_PATH="/opt/homebrew/bin/deno"

# Setup database tables with stderr preserved but stdout redirected
echo "Setting up database tables..." >&2
"$DENO_PATH" run --allow-net --allow-env --allow-read src/db/setup.ts >/dev/null
echo "Database setup completed." >&2

# Start the server with stdout completely suppressed
echo "Starting MCP server on port 8001..." >&2

# Use exec to replace this process with the server process
# Redirect ALL stdout to /dev/null to ensure no protocol corruption
exec "$DENO_PATH" run --allow-net --allow-env --allow-read src/main.ts >/dev/null 