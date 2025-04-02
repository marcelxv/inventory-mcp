import { Pool } from "postgres";

// Database connection configuration
const POOL_CONNECTIONS = 20;
const connectionConfig = {
  user: Deno.env.get("POSTGRES_USER") || "marcelssl",
  password: Deno.env.get("POSTGRES_PASSWORD") || "marcelssl",
  database: Deno.env.get("POSTGRES_DB") || "inventory",
  hostname: Deno.env.get("POSTGRES_HOST") || "localhost",
  port: Number(Deno.env.get("POSTGRES_PORT")) || 5432,
};

// Create a connection pool
const pool = new Pool(connectionConfig, POOL_CONNECTIONS);

export default pool; 