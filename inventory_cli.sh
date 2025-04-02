#!/bin/bash

# Inventory Management CLI
# This script provides a command-line interface to interact directly with the inventory MCP

# Terminal colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Clean up and ensure we have a fresh environment
echo -e "${BLUE}Preparing environment...${NC}"
./restart_server.sh >/dev/null

# Start the MCP server in the background
echo -e "${BLUE}Starting inventory management server...${NC}"
/opt/homebrew/bin/deno run --allow-net --allow-env --allow-read src/main.ts >/dev/null 2>&1 &
SERVER_PID=$!

# Trap to ensure server is killed when script exits
trap "kill $SERVER_PID 2>/dev/null; ./restart_server.sh >/dev/null; echo -e '\n${BLUE}Server stopped.${NC}'; exit" INT TERM EXIT

# Wait for server to start
sleep 2

# Check if server is running
if ! curl -s http://localhost:8001/health >/dev/null; then
  echo -e "${RED}Failed to start server. Exiting.${NC}"
  exit 1
fi

# Display available actions by querying the schema
SCHEMA=$(curl -s http://localhost:8001/schema)
ACTIONS=$(echo "$SCHEMA" | grep -o '"actions":{[^}]*}' | grep -o '"[^"]*":{' | tr -d ':{' | tr -d '"' | sort)

echo -e "${GREEN}Inventory Management server running on http://localhost:8001${NC}"
echo -e "${YELLOW}====================================${NC}"
echo -e "${YELLOW}     Inventory Management CLI       ${NC}"
echo -e "${YELLOW}====================================${NC}"
echo -e "${BLUE}Available commands:${NC}"

# Format and display available actions
for action in $ACTIONS; do
  echo -e "  ${GREEN}${action}${NC}"
done

echo -e "\n${BLUE}Usage examples:${NC}"
echo -e "  ${YELLOW}product.list${NC} - List all products"
echo -e "  ${YELLOW}product.create {\"name\":\"New Item\",\"sku\":\"NI001\",\"price\":19.99,\"quantity\":10}${NC} - Create product"
echo -e "  ${YELLOW}help${NC} - Show this help information"
echo -e "  ${YELLOW}exit${NC} - Exit the CLI"
echo -e "\n${BLUE}Type your commands below:${NC}"

# Execute an MCP action
execute_action() {
  local action="$1"
  local params="$2"
  
  # Format the output nicely
  echo -e "${YELLOW}Executing: ${action}${NC}"
  
  if [ -z "$params" ]; then
    curl -s -X POST -H "Content-Type: application/json" \
      -d "{\"action\":\"$action\"}" \
      http://localhost:8001/action | jq -C . | less -R
  else
    curl -s -X POST -H "Content-Type: application/json" \
      -d "{\"action\":\"$action\",\"params\":$params}" \
      http://localhost:8001/action | jq -C . | less -R
  fi
}

# Main CLI loop
while true; do
  echo -e "${BLUE}> ${NC}" 
  read -r input
  
  # Exit condition
  if [[ "$input" == "exit" || "$input" == "quit" ]]; then
    echo -e "${BLUE}Shutting down...${NC}"
    break
  fi
  
  # Help command
  if [[ "$input" == "help" ]]; then
    echo -e "${BLUE}Available commands:${NC}"
    for action in $ACTIONS; do
      echo -e "  ${GREEN}${action}${NC}"
    done
    echo -e "  ${YELLOW}help${NC} - Show this help information"
    echo -e "  ${YELLOW}exit${NC} - Exit the CLI"
    continue
  fi
  
  # Parse the input to get action and parameters
  if [[ "$input" =~ (.*)\{(.*)\} ]]; then
    action="${BASH_REMATCH[1]}"
    params="{${BASH_REMATCH[2]}}"
    
    # Trim whitespace
    action=$(echo "$action" | xargs)
    
    execute_action "$action" "$params"
  else
    # No parameters
    execute_action "$input"
  fi
done 