#!/bin/bash

# This script populates the inventory database with test data

# Terminal colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up test data for inventory management...${NC}"

# Ensure clean environment
./restart_server.sh >/dev/null

# Start the server in the background
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

# Execute command and get ID from result
execute_command_get_id() {
  local action="$1"
  local params="$2"
  
  echo -e "${YELLOW}Executing: ${GREEN}${action}${NC}"
  local result=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"action\":\"$action\",\"params\":$params}" http://localhost:8001/action)
  echo "$result" | jq .
  
  # Extract ID from response
  local id=$(echo "$result" | jq -r '.data.id // empty')
  echo "$id"
}

# Create Categories
echo -e "\n${BLUE}Creating categories...${NC}"
electronics_id=$(execute_command_get_id "category.create" "{\"name\":\"Electronics\",\"description\":\"Electronic devices and gadgets\"}")
furniture_id=$(execute_command_get_id "category.create" "{\"name\":\"Furniture\",\"description\":\"Office and home furniture\"}")
clothing_id=$(execute_command_get_id "category.create" "{\"name\":\"Clothing\",\"description\":\"Apparel and accessories\"}")

# Create Products in Electronics
echo -e "\n${BLUE}Creating electronics products...${NC}"
laptop_id=$(execute_command_get_id "product.create" "{\"name\":\"Premium Laptop\",\"sku\":\"TECH-001\",\"description\":\"High-end laptop with 16GB RAM and 512GB SSD\",\"price\":1299.99,\"quantity\":20}")
phone_id=$(execute_command_get_id "product.create" "{\"name\":\"Smartphone Pro\",\"sku\":\"TECH-002\",\"description\":\"Latest smartphone with 128GB storage\",\"price\":899.99,\"quantity\":50}")
tablet_id=$(execute_command_get_id "product.create" "{\"name\":\"Tablet Ultra\",\"sku\":\"TECH-003\",\"description\":\"10-inch tablet with stylus\",\"price\":499.99,\"quantity\":30}")

# Create Products in Furniture
echo -e "\n${BLUE}Creating furniture products...${NC}"
desk_id=$(execute_command_get_id "product.create" "{\"name\":\"Standing Desk\",\"sku\":\"FURN-001\",\"description\":\"Adjustable height standing desk\",\"price\":349.99,\"quantity\":15}")
chair_id=$(execute_command_get_id "product.create" "{\"name\":\"Ergonomic Chair\",\"sku\":\"FURN-002\",\"description\":\"Office chair with lumbar support\",\"price\":249.99,\"quantity\":25}")

# Create Products in Clothing
echo -e "\n${BLUE}Creating clothing products...${NC}"
tshirt_id=$(execute_command_get_id "product.create" "{\"name\":\"Cotton T-Shirt\",\"sku\":\"CLOTH-001\",\"description\":\"100% cotton t-shirt, various colors\",\"price\":19.99,\"quantity\":100}")
jacket_id=$(execute_command_get_id "product.create" "{\"name\":\"Winter Jacket\",\"sku\":\"CLOTH-002\",\"description\":\"Waterproof winter jacket with hood\",\"price\":89.99,\"quantity\":40}")

# Create some inventory transactions
echo -e "\n${BLUE}Creating inventory transactions...${NC}"
execute_command_get_id "transaction.create" "{\"product_id\":$laptop_id,\"quantity\":5,\"transaction_type\":\"receiving\",\"notes\":\"Restock from supplier\"}"
execute_command_get_id "transaction.create" "{\"product_id\":$phone_id,\"quantity\":-2,\"transaction_type\":\"shipping\",\"notes\":\"Customer order #1234\"}"
execute_command_get_id "transaction.create" "{\"product_id\":$chair_id,\"quantity\":10,\"transaction_type\":\"receiving\",\"notes\":\"Initial inventory\"}"

# List all products
echo -e "\n${BLUE}Listing all products:${NC}"
curl -s -X POST -H "Content-Type: application/json" -d "{\"action\":\"product.list\"}" http://localhost:8001/action | jq .

# List all categories  
echo -e "\n${BLUE}Listing all categories:${NC}"
curl -s -X POST -H "Content-Type: application/json" -d "{\"action\":\"category.list\"}" http://localhost:8001/action | jq .

# List all transactions
echo -e "\n${BLUE}Listing recent transactions:${NC}"
curl -s -X POST -H "Content-Type: application/json" -d "{\"action\":\"transaction.list\"}" http://localhost:8001/action | jq .

echo -e "\n${GREEN}Test data setup complete!${NC}"
echo -e "You can now use the CLI tools to interact with this data."
echo -e "Try running: ${YELLOW}./deepseek_cli.sh${NC} or ${YELLOW}./inventory_cli.sh${NC}"

# Keep server running if requested
if [[ "$1" == "--keep-running" ]]; then
  echo -e "\n${BLUE}Server will continue running. Press Ctrl+C to stop.${NC}"
  # Remove the trap so we don't kill the server on exit
  trap - INT TERM EXIT
  # Wait forever
  tail -f /dev/null
else
  # Shutdown
  kill $SERVER_PID
  ./restart_server.sh >/dev/null
  echo -e "\n${BLUE}Server stopped.${NC}"
fi 