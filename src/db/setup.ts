// Import the MCP protocol handler first to ensure all console output is properly redirected
import "../mcp_protocol.ts";

import pool from "./client.ts";

// Redirect console.log to console.error for MCP compatibility
const originalConsoleLog = console.log;
console.log = function(...args) {
  console.error(...args);
};

// SQL statements to create tables
const createTablesSQL = `
-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(50) UNIQUE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product-Category relationship
CREATE TABLE IF NOT EXISTS product_categories (
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

-- Inventory transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('receiving', 'shipping', 'adjustment')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

// Set up the database
async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.error("Setting up database tables...");
    await client.queryObject(createTablesSQL);
    console.error("Database tables created successfully.");
  } catch (error) {
    console.error("Error setting up database:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run setup
if (import.meta.main) {
  await setupDatabase();
}

export { setupDatabase }; 