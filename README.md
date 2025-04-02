# Inventory Management MCP

A Model Context Protocol (MCP) implementation for inventory management that can be used with different AI models.

## Features

- Manage products, categories, and inventory transactions
- Full CRUD operations for inventory items
- Compatible with multiple AI backends (Claude, Deepseek, OpenAI, Mistral)
- Multiple ways to interact: Unified CLI with LLM support, Direct CLI, or Claude Desktop

## Requirements

- Deno (v1.32.0 or higher)
- PostgreSQL
- AI API key (optional, only for AI-enhanced CLI)
  - Claude API key (for Claude integration)
  - Deepseek API key (for Deepseek integration)
  - OpenAI API key (for OpenAI integration)
  - Mistral API key (for Mistral integration)
- jq (for the CLI options)

## Setup

1. Clone this repository
2. Make sure PostgreSQL is running with appropriate credentials
3. Set environment variables (in your shell profile or .env file):
   ```
   # Database configuration
   export POSTGRES_USER=your_username
   export POSTGRES_PASSWORD=your_password
   export POSTGRES_DB=inventory
   export POSTGRES_HOST=localhost
   export POSTGRES_PORT=5432
   
   # Optional: Set your preferred LLM provider and API keys
   export LLM_PROVIDER=deepseek  # or claude, openai, mistral
   export DEEPSEEK_API_KEY=your_deepseek_api_key
   export CLAUDE_API_KEY=your_claude_api_key
   export OPENAI_API_KEY=your_openai_api_key
   export MISTRAL_API_KEY=your_mistral_api_key
   ```

   Alternatively, copy the `.env.example` file to `.env` and fill in your values:
   ```
   cp .env.example .env
   nano .env  # Edit the file with your credentials
   ```

## Available API Actions

The system provides the following API actions that can be used by LLMs or direct calls:

### Product Management

| Action | Description | Parameters |
|--------|-------------|------------|
| `product.create` | Create a new product | `name` (string, required), `sku` (string), `description` (string), `price` (number), `quantity` (number) |
| `product.get` | Get a product by ID | `id` (number, required) |
| `product.update` | Update an existing product | `id` (number, required), `name` (string), `sku` (string), `description` (string), `price` (number), `quantity` (number) |
| `product.delete` | Delete a product | `id` (number, required) |
| `product.list` | List all products | none |

### Category Management

| Action | Description | Parameters |
|--------|-------------|------------|
| `category.create` | Create a new category | `name` (string, required), `description` (string) |
| `category.get` | Get a category by ID | `id` (number, required) |
| `category.update` | Update an existing category | `id` (number, required), `name` (string), `description` (string) |
| `category.delete` | Delete a category | `id` (number, required) |
| `category.list` | List all categories | none |

### Inventory Transactions

| Action | Description | Parameters |
|--------|-------------|------------|
| `transaction.create` | Create a new inventory transaction | `product_id` (number, required), `quantity` (number, required), `transaction_type` (string, required: 'receiving', 'shipping', or 'adjustment'), `notes` (string) |
| `transaction.get` | Get a transaction by ID | `id` (number, required) |
| `transaction.list` | List all transactions | none |

## CLI Usage Options

### Option 1: Unified LLM CLI

Our recommended way to interact with the inventory system using any supported LLM:

1. Make the CLI script executable:
   ```
   chmod +x llm_inventory_cli.sh
   ```

2. Run the CLI with your preferred LLM provider:
   ```
   # Use the default provider (from LLM_PROVIDER env var or deepseek)
   ./llm_inventory_cli.sh

   # Or specify a provider
   ./llm_inventory_cli.sh --provider claude
   ./llm_inventory_cli.sh --provider openai
   ./llm_inventory_cli.sh --provider mistral
   ```

3. Command-line options:
   ```
   --provider, --llm VALUE  Specify LLM provider (deepseek, claude, openai, mistral)
   --debug, -d              Enable debug mode (show action execution details)
   --port, -p VALUE         Specify port for the server (default: 8001)
   --help, -h               Show this help message
   ```

4. Use natural language to ask inventory-related questions:
   ```
   > How many products do we have in stock?
   > What categories have the most products? 
   > What were the last 5 inventory transactions?
   > Add a new smartphone product that costs $899.99 with 25 in stock
   ```

5. Execute direct MCP commands using the ! prefix:
   ```
   > !product.list
   > !product.create {"name": "New Product", "sku": "NP001", "price": 19.99, "quantity": 50}
   ```

6. Type `exit` or `quit` to exit the CLI.

7. Troubleshooting with debug mode:
   ```
   # Run with debug flag to see API request/response details
   ./llm_inventory_cli.sh --debug
   ```
   This will save debug information to files with names like `deepseek_debug_payload.json` when API requests fail.

### Option 2: Direct CLI (No AI Required)

The simplest way to interact with your inventory management system directly:

1. Make the CLI script executable:
   ```
   chmod +x inventory_cli.sh
   ```

2. Run the CLI:
   ```
   ./inventory_cli.sh
   ```

3. Execute direct MCP commands:
   ```
   > product.list
   > product.create {"name": "New Product", "sku": "NP001", "price": 19.99, "quantity": 50}
   > category.list
   ```

4. Type `help` to see available commands or `exit` to quit.

### Option 3: Single-Provider LLMs

We also provide dedicated CLI scripts for specific LLMs if needed:

- Claude: `./claude_cli.sh`
- Deepseek: `./deepseek_cli.sh`

### Option 4: Claude Desktop Integration

You can also use this MCP with Claude Desktop:

1. Ensure Claude Desktop is installed
2. Make the restart script executable:
   ```
   chmod +x restart_server.sh
   ```
3. Run the restart script to clean up any existing instances:
   ```
   ./restart_server.sh
   ```
4. Start Claude Desktop and select "Inventory Management" from the MCP menu

## Setting up Test Data

To quickly populate your database with sample products, categories and transactions:

```
# Setup test data and exit
./setup_test_data.sh

# Setup test data and keep the server running
./setup_test_data.sh --keep-running
```

## Testing

You can test the server directly without AI integration:

1. Make the test script executable:
   ```
   chmod +x test_server.sh
   ```
2. Run the test script:
   ```
   ./test_server.sh
   ```

## File Structure

- `src/main.ts` - Main server implementation
- `src/mcp_protocol.ts` - Protocol handler for MCP compliance
- `src/mcp.ts` - MCP schema and action handlers
- `src/db/` - Database connections and utilities
- `src/models/` - Data models for inventory entities
- `llm_inventory_cli.sh` - Unified CLI supporting multiple LLM providers
- `claude_cli.sh` - CLI specific to Claude
- `deepseek_cli.sh` - CLI specific to Deepseek
- `inventory_cli.sh` - Direct CLI interface (no AI integration)
- `restart_server.sh` - Utility to clean up server processes
- `test_server.sh` - Server testing script
- `setup_test_data.sh` - Script to populate test data
- `.env.example` - Example environment variables file

## Troubleshooting

If you encounter issues with port conflicts:

1. Run `./restart_server.sh` to kill any existing processes on port 8001
2. Check for any remaining processes: `lsof -i :8001`
3. Kill manually if needed: `kill -9 [PID]`

For API issues:
1. Enable debug mode: `./llm_inventory_cli.sh --debug`
2. Check the *_debug_*.json files that are created for failed requests
3. Verify that your API keys are correct

For PostgreSQL issues:
1. Make sure PostgreSQL is running
2. Verify your database credentials are correct
3. Check that the database schema exists

## Examples

### Basic Inventory Management

```
# Create a new product
!product.create {"name": "Wireless Earbuds", "sku": "AUDIO-001", "description": "Bluetooth wireless earbuds with noise cancellation", "price": 149.99, "quantity": 30}

# Create a category
!category.create {"name": "Audio Equipment", "description": "Headphones, speakers, and audio accessories"}

# Record a shipping transaction
!transaction.create {"product_id": 1, "quantity": -5, "transaction_type": "shipping", "notes": "Customer order #12345"}
```

### Natural Language Examples

```
> How many wireless earbuds do we have in stock?
> What's our most expensive product? 
> Update the price of Wireless Earbuds to $129.99
> Create a new electronics category
```

## License

MIT 