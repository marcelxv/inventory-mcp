#!/bin/bash

# This script tests the MCP server directly to check if it's working properly

# First run the cleanup script
./restart_server.sh

echo "===========================================" 
echo "Starting test server..."
echo "===========================================" 

# Start the server in the background
/opt/homebrew/bin/deno run --allow-net --allow-env --allow-read src/main.ts 2>&1 | grep -v "MCP" &
SERVER_PID=$!

# Give it time to start
sleep 2

echo "Testing server health endpoint..."
curl -s http://localhost:8001/health

echo ""
echo "Testing schema endpoint..."
curl -s http://localhost:8001/schema | head -20

echo ""
echo "Testing a simple action call..."
curl -s -X POST -H "Content-Type: application/json" -d '{"action":"product.list"}' http://localhost:8001/action | head -20

echo ""
echo "===========================================" 
echo "Test complete. Killing test server."
echo "===========================================" 

# Kill the server
kill $SERVER_PID

# Run the cleanup script again to ensure we don't leave the server running
./restart_server.sh >/dev/null

echo "Done. Now restart Claude Desktop and try using the MCP tool there." 