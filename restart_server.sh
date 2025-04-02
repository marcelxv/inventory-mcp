#!/bin/bash

# This script ensures a clean restart of the MCP server for Claude Desktop

echo "=========================================="
echo "Inventory Management MCP Server Setup"
echo "=========================================="

# Kill any existing Deno processes on port 8001 using multiple methods
echo "Killing any existing Deno processes on port 8001..."
pkill -9 -f "deno.*:8001" || true

# Ensure we're killing anything on port 8001
echo "Checking for any processes on port 8001..."
lsof -i :8001 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true

# Wait a moment to ensure processes are terminated
sleep 1

# Verify the port is free
if lsof -i :8001 | grep LISTEN > /dev/null; then
  echo "ERROR: Port 8001 is still in use after cleanup!"
  echo "Please manually terminate the process and try again."
  lsof -i :8001 | grep LISTEN
  exit 1
fi

echo "Port 8001 is free and ready to use."

# Change to project directory
cd "$(dirname "$0")"

# Set up database tables
echo "Setting up database tables..."
/opt/homebrew/bin/deno run --allow-net --allow-env --allow-read src/db/setup.ts >/dev/null 2>&1

# Clear Claude Desktop's process cache (optional but may help in some cases)
echo "Clearing Claude Desktop cache..."
defaults delete com.anthropic.claude MCP_processes 2>/dev/null || true

# Print instructions
echo ""
echo "======= SETUP COMPLETE ======="
echo ""
echo "Now in Claude Desktop:"
echo "1. Restart Claude Desktop if it's running"
echo "2. Access Inventory Management from the MCP menu"
echo ""
echo "If you still see port conflicts:"
echo "- Check Activity Monitor for any 'deno' processes"
echo "- Try restarting your computer"
echo ""

# Final check
echo "Final port status:"
lsof -i :8001 || echo "Port 8001 is clear" 