#!/bin/bash

# Unified LLM Inventory Management CLI
# This script provides a command-line interface to various LLMs with the inventory management MCP

# Terminal colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper function to capitalize first letter (for compatibility with older bash)
capitalize() {
  local str="$1"
  local first_char=$(echo "${str:0:1}" | tr '[:lower:]' '[:upper:]')
  local rest_chars=$(echo "${str:1}")
  echo "$first_char$rest_chars"
}

# Default configuration
LLM_PROVIDER=${LLM_PROVIDER:-"deepseek"}  # Default provider
DEBUG_MODE=false
PORT=8001

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --provider|--llm)
      LLM_PROVIDER="$2"
      shift
      ;;
    --debug|-d)
      DEBUG_MODE=true
      ;;
    --port|-p)
      PORT="$2"
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --provider, --llm VALUE  Specify LLM provider (deepseek, claude, openai, mistral)"
      echo "  --debug, -d              Enable debug mode (show action execution details)"
      echo "  --port, -p VALUE         Specify port for the server (default: 8001)"
      echo "  --help, -h               Show this help message"
      echo ""
      echo "Environment variables:"
      echo "  LLM_PROVIDER             Set default LLM provider"
      echo "  DEEPSEEK_API_KEY         API key for Deepseek"
      echo "  CLAUDE_API_KEY           API key for Claude"
      echo "  OPENAI_API_KEY           API key for OpenAI"
      echo "  MISTRAL_API_KEY          API key for Mistral"
      exit 0
      ;;
    *)
      echo "Unknown parameter: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
  shift
done

# Function to load API keys from .env file if present
load_env_file() {
  if [ -f .env ]; then
    echo -e "${BLUE}Loading environment variables from .env file...${NC}"
    set -o allexport
    source .env
    set +o allexport
  fi
}

# Load environment variables
load_env_file

# Configuration for each provider
configure_provider() {
  local provider=$1
  
  case $provider in
    "deepseek")
      MODEL="deepseek-reasoner"
      API_KEY=${DEEPSEEK_API_KEY}
      API_URL="https://api.deepseek.com/chat/completions"
      AUTH_HEADER="Authorization: Bearer"
      KEY_ENV_VAR="DEEPSEEK_API_KEY"
      ;;
    "claude")
      MODEL="claude-3-opus-20240229"
      API_KEY=${CLAUDE_API_KEY}
      API_URL="https://api.anthropic.com/v1/messages"
      AUTH_HEADER="x-api-key"
      KEY_ENV_VAR="CLAUDE_API_KEY"
      ;;
    "openai")
      MODEL="gpt-4o"
      API_KEY=${OPENAI_API_KEY}
      API_URL="https://api.openai.com/v1/chat/completions"
      AUTH_HEADER="Authorization: Bearer"
      KEY_ENV_VAR="OPENAI_API_KEY"
      ;;
    "mistral")
      MODEL="mistral-large-latest"
      API_KEY=${MISTRAL_API_KEY}
      API_URL="https://api.mistral.ai/v1/chat/completions"
      AUTH_HEADER="Authorization: Bearer"
      KEY_ENV_VAR="MISTRAL_API_KEY"
      ;;
    *)
      echo -e "${RED}Unsupported LLM provider: $provider${NC}"
      echo "Supported providers: deepseek, claude, openai, mistral"
      exit 1
      ;;
  esac
  
  # Check for API key
  if [ -z "$API_KEY" ]; then
    local provider_capitalized=$(capitalize "$provider")
    echo -e "${YELLOW}${provider_capitalized} API key not found in environment.${NC}"
    echo -e "${BLUE}Enter your ${provider_capitalized} API key:${NC} "
    read -r API_KEY
    export "$KEY_ENV_VAR"="$API_KEY"
    echo -e "${GREEN}API key set for this session.${NC}"
    echo -e "${BLUE}To persist this key, add the following to your shell profile or .env file:${NC}"
    echo "export $KEY_ENV_VAR=your-api-key"
    echo
  fi
}

# Configure the selected provider
configure_provider "$LLM_PROVIDER"

# Provider name for display
PROVIDER_DISPLAY=$(capitalize "$LLM_PROVIDER")

# First ensure we have a clean environment
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
if ! curl -s http://localhost:$PORT/health >/dev/null; then
  echo -e "${RED}Failed to start server. Exiting.${NC}"
  exit 1
fi

echo -e "${GREEN}Inventory Management server running on http://localhost:$PORT${NC}"
echo -e "${YELLOW}====================================${NC}"
echo -e "${YELLOW}   ${PROVIDER_DISPLAY} Inventory Management CLI   ${NC}"
echo -e "${YELLOW}====================================${NC}"
echo -e "${BLUE}Type your inventory queries below. Type 'exit' to quit.${NC}"
echo -e "${BLUE}Use !command format for direct MCP actions (e.g., !product.list)${NC}"
if [ "$DEBUG_MODE" = true ]; then
  echo -e "${CYAN}Debug mode enabled: showing detailed action execution${NC}"
fi
echo

# Execute any MCP command directly
execute_command() {
  local action="$1"
  local params="$2"
  
  if [ "$DEBUG_MODE" = true ]; then
    echo -e "${YELLOW}Executing: ${GREEN}${action}${NC}"
    
    if [ -z "$params" ]; then
      curl -s -X POST -H "Content-Type: application/json" -d "{\"action\":\"$action\"}" http://localhost:$PORT/action | jq .
    else
      echo -e "${YELLOW}With parameters: ${BLUE}${params}${NC}"
      curl -s -X POST -H "Content-Type: application/json" -d "{\"action\":\"$action\",\"params\":$params}" http://localhost:$PORT/action | jq .
    fi
  else
    # In non-debug mode, execute silently and return result
    if [ -z "$params" ]; then
      local result=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"action\":\"$action\"}" http://localhost:$PORT/action)
    else
      local result=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"action\":\"$action\",\"params\":$params}" http://localhost:$PORT/action)
    fi
    echo "$result"
  fi
}

# Function to extract and execute actions from LLM's response
extract_and_execute_actions() {
  local response="$1"
  local actions_executed=0
  
  # Look for action patterns
  while read -r line; do
    # Skip lines that don't look like actions
    if [[ ! "$line" =~ ^action\. ]]; then
      continue
    fi
    
    # Extract action name and parameters
    if [[ "$line" =~ ^action\.([a-z]+\.[a-z]+)[[:space:]]+\{(.*)\}$ ]]; then
      local action="${BASH_REMATCH[1]}"
      local params="${BASH_REMATCH[2]}"
      
      # Clean up parameters - fix field names to match API expectations
      params=$(echo "$params" | sed 's/"stock_quantity"/"quantity"/g' | sed 's/"type"/"transaction_type"/g')
      
      echo -e "\n${BLUE}Auto-executing action from ${PROVIDER_DISPLAY}:${NC}"
      execute_command "$action" "{$params}"
      ((actions_executed++))
    fi
  done <<< "$response"
  
  return $actions_executed
}

# Function to create a simple JSON payload using jq
create_simple_payload() {
  local prompt="$1"
  local products="$2"
  local categories="$3"
  local transactions="$4"
  local provider="$5"
  local model="$6"
  local temp_file="$7"
  
  # System prompt simplified to avoid escaping issues
  local system_prompt="You are an inventory management assistant. Use format: action.name { parameters }. Available actions: product.create, product.get, product.update, product.delete, product.list, category.create, category.get, category.update, category.delete, category.list, transaction.create, transaction.get, transaction.list."
  
  # Create a base object with jq
  jq -n \
    --arg model "$model" \
    --arg system "$system_prompt" \
    --arg question "$prompt" \
    '{
      "model": $model,
      "temperature": 0.2,
      "max_tokens": 4000,
      "stream": false
    }' > "$temp_file"
  
  # Add provider-specific fields
  case $provider in
    "deepseek"|"openai"|"mistral")
      jq --arg system "$system_prompt" \
         --arg content "Current inventory data:
Products: $products
Categories: $categories
Recent Transactions: $transactions

My question: $prompt" \
         '.messages = [
           {"role": "system", "content": $system},
           {"role": "user", "content": $content}
         ]' "$temp_file" > "${temp_file}.tmp" && mv "${temp_file}.tmp" "$temp_file"
      ;;
    "claude")
      jq --arg system "$system_prompt" \
         --arg content "Current inventory data:
Products: $products
Categories: $categories
Recent Transactions: $transactions

My question: $prompt" \
         '. += {
           "system": $system,
           "messages": [
             {"role": "user", "content": $content}
           ]
         }' "$temp_file" > "${temp_file}.tmp" && mv "${temp_file}.tmp" "$temp_file"
      ;;
  esac
}

# Function to query LLM via the MCP server
query_llm() {
  local prompt="$1"
  
  # Display a "thinking" indicator
  echo -e "${YELLOW}${PROVIDER_DISPLAY} is thinking...${NC}"
  
  # Get available inventory data for context
  local products_raw=$(curl -s -X POST -H "Content-Type: application/json" -d '{"action":"product.list"}' http://localhost:$PORT/action)
  local categories_raw=$(curl -s -X POST -H "Content-Type: application/json" -d '{"action":"category.list"}' http://localhost:$PORT/action)
  local transactions_raw=$(curl -s -X POST -H "Content-Type: application/json" -d '{"action":"transaction.list"}' http://localhost:$PORT/action)
  
  # Format the JSON responses as strings for display
  local products=$(echo "$products_raw" | jq -c .)
  local categories=$(echo "$categories_raw" | jq -c .)
  local transactions=$(echo "$transactions_raw" | jq -c .)
  
  # Create temp file for payload
  local temp_file=$(mktemp)
  
  # Create the JSON payload using jq for proper escaping
  create_simple_payload "$prompt" "$products" "$categories" "$transactions" "$LLM_PROVIDER" "$MODEL" "$temp_file"
  
  # For debugging
  if [ "$DEBUG_MODE" = true ]; then
    echo -e "${CYAN}API request to ${API_URL}${NC}"
    if [ "$LLM_PROVIDER" = "claude" ]; then
      echo -e "${CYAN}Request headers: ${AUTH_HEADER}: $API_KEY${NC}"
    else
      echo -e "${CYAN}Request headers: ${AUTH_HEADER} $API_KEY${NC}"
    fi
    echo -e "${CYAN}Request payload:${NC}"
    cat "$temp_file" | jq .
  fi
  
  # Call LLM API using the payload from file
  local response=""
  if [ "$LLM_PROVIDER" = "claude" ]; then
    response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -H "${AUTH_HEADER}: $API_KEY" \
      -H "anthropic-version: 2023-06-01" \
      -d @"$temp_file")
  else
    response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -H "${AUTH_HEADER} $API_KEY" \
      -d @"$temp_file")
  fi
  
  # For debugging - save the request payload and response to files
  if (echo "$response" | grep -q "error") || [ "$DEBUG_MODE" = true ]; then
    echo -e "${DEBUG_MODE:+${CYAN}}${response:+${RED}}API request failed. Saving debug information...${NC}"
    cp "$temp_file" "${LLM_PROVIDER}_debug_payload.json"
    echo "$response" > "${LLM_PROVIDER}_debug_response.json"
    echo "Debug info saved to ${LLM_PROVIDER}_debug_*.json"
  fi
  
  # Clean up temp file
  rm "$temp_file"
  
  # Extract and display LLM's response
  local llm_response=$(extract_llm_response "$LLM_PROVIDER" "$response")
  
  if [ -z "$llm_response" ] || [ "$llm_response" = "null" ]; then
    echo -e "${RED}Error getting response from ${PROVIDER_DISPLAY} API${NC}"
    echo "Raw response: $response"
    return 1
  else
    echo -e "${GREEN}${PROVIDER_DISPLAY}:${NC}"
    echo -e "$llm_response" | sed 's/\\n/\n/g'
    
    # Extract and execute actions automatically
    extract_and_execute_actions "$llm_response"
    local actions_executed=$?
    
    if [ $actions_executed -gt 0 ]; then
      echo -e "\n${GREEN}Successfully executed $actions_executed actions from ${PROVIDER_DISPLAY}'s response.${NC}"
    fi
    
    return 0
  fi
}

# Function to extract response content based on provider
extract_llm_response() {
  local provider="$1"
  local response="$2"
  
  case $provider in
    "deepseek"|"openai"|"mistral")
      echo "$response" | jq -r '.choices[0].message.content' 2>/dev/null
      ;;
    "claude")
      echo "$response" | jq -r '.content[0].text' 2>/dev/null
      ;;
  esac
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
  
  # Check if this is a direct command (format: !command params)
  if [[ "$input" == !* ]]; then
    # Extract the command and parameters
    cmd=${input#!}
    action=${cmd%% *}
    params=${cmd#* }
    
    if [ "$action" == "$params" ]; then
      # No parameters
      execute_command "$action"
    else
      # There are parameters - parse them properly
      execute_command "$action" "$params"
    fi
  else
    # Regular query to LLM
    query_llm "$input"
  fi
  
  echo
done 