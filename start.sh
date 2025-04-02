#!/bin/bash

# Colors for better terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}   Inventory MCP Startup Script    ${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL doesn't appear to be installed.${NC}"
    echo "Please install PostgreSQL before continuing."
    exit 1
fi

# Check if Deno is installed
if ! command -v deno &> /dev/null; then
    echo -e "${YELLOW}Deno doesn't appear to be installed.${NC}"
    echo "Installing Deno..."
    
    # Install Deno using their install script
    curl -fsSL https://deno.land/x/install/install.sh | sh
    
    # Add Deno to path for this session
    export DENO_INSTALL="$HOME/.deno"
    export PATH="$DENO_INSTALL/bin:$PATH"
    
    echo -e "${GREEN}Deno installed successfully!${NC}"
else
    echo -e "${GREEN}Deno is already installed!${NC}"
fi

# Create the inventory database if it doesn't exist
echo -e "\n${BLUE}Setting up the database...${NC}"
if ! psql -lqt | cut -d \| -f 1 | grep -qw inventory; then
    echo "Creating inventory database..."
    createdb inventory || { echo "Failed to create database. You may need to update your credentials in .env"; exit 1; }
else
    echo "Database 'inventory' already exists."
fi

# Update the .env file with the current user
echo -e "\n${BLUE}Updating database connection settings...${NC}"
current_user=$(whoami)
sed -i.bak "s/^POSTGRES_USER=.*/POSTGRES_USER=$current_user/" .env
sed -i.bak "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$current_user/" .env
rm -f .env.bak

echo -e "\n${BLUE}Initializing the database tables...${NC}"
deno task setup

echo -e "\n${BLUE}Starting the Inventory MCP server...${NC}"
deno task start &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Display connection information
echo -e "\n${GREEN}Inventory MCP server is running!${NC}"
echo -e "\n${YELLOW}To connect Claude Desktop:${NC}"
echo "1. Open Claude Desktop"
echo "2. Go to Settings > Tools"
echo "3. Add a new MCP tool with these settings:"
echo "   - Name: Inventory Management"
echo "   - Base URL: http://localhost:8000"
echo "   - Schema Endpoint: /schema"
echo "   - Action Endpoint: /claude"
echo "   - Query Endpoint: /query"

echo -e "\n${YELLOW}Example commands for Claude:${NC}"
echo '- "Show all products in inventory"'
echo '- "Add a new wireless keyboard to inventory with SKU KB-123 priced at $49.99"'
echo '- "Update the quantity of product #1 to 20 units"'

echo -e "\n${YELLOW}Press Ctrl+C to stop the server${NC}"

# Wait for the user to press Ctrl+C
trap "kill $SERVER_PID; echo -e '\n${GREEN}Server stopped.${NC}'; exit 0" INT
wait $SERVER_PID 