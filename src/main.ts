// Import the MCP protocol handler first to ensure all console output is properly redirected
import "./mcp_protocol.ts";

import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { MCP_SCHEMA, handleMCPRequest } from "./mcp.ts";
import { parse } from "https://deno.land/std@0.214.0/jsonc/parse.ts";

// Immediately silence any stdout
// We don't want ANY stdout output to interfere with the MCP protocol
Deno.stdout.write = function(): Promise<number> {
  return Promise.resolve(0);
};

// Ensure only one server instance runs
async function isPortInUse(port: number): Promise<boolean> {
  try {
    const listener = Deno.listen({ port });
    listener.close();
    return false;
  } catch (error) {
    return true;
  }
}

// Clean up any existing processes on port 8001
async function cleanupExistingProcess(): Promise<void> {
  try {
    // Try multiple ways to kill processes on the port
    const killCmd = new Deno.Command("pkill", {
      args: ["-f", "deno.*:8001"],
      stderr: "null",
      stdout: "null"
    });
    await killCmd.output();
    
    // Also try lsof to be extra thorough
    const lsofCmd = new Deno.Command("sh", {
      args: ["-c", "lsof -i :8001 | grep LISTEN | awk '{print $2}' | xargs kill -9"],
      stderr: "null",
      stdout: "null"
    });
    await lsofCmd.output();
    
    // Wait for process cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (e) {
    // Ignore errors from process cleanup
  }
}

// Only start the server if we're the primary instance
async function startServer() {
  // PORT must be 8001 for Claude Desktop configuration
  const PORT = 8001;
  
  // First check if port is in use
  if (await isPortInUse(PORT)) {
    // Port is in use, try to clean up
    const encoder = new TextEncoder();
    Deno.stderr.write(encoder.encode(`Port ${PORT} already in use. Attempting to clean up...\n`));
    
    await cleanupExistingProcess();
    
    // Check again
    if (await isPortInUse(PORT)) {
      // Still in use, can't proceed
      Deno.stderr.write(encoder.encode(`ERROR: Cannot start server, port ${PORT} still in use after cleanup attempt.\n`));
      Deno.exit(1);
    }
  }
  
  // Create Oak application
  const app = new Application({
    // Disable default logger to prevent it from writing to stdout
    logErrors: false
  });

  const router = new Router();

  // Add custom logging middleware that only writes to stderr
  app.use(async (ctx, next) => {
    const start = Date.now();
    try {
      await next();
    } catch (error) {
      const encoder = new TextEncoder();
      Deno.stderr.write(encoder.encode(`Error: ${error.message}\n`));
      throw error;
    }
    const ms = Date.now() - start;
    const encoder = new TextEncoder();
    Deno.stderr.write(encoder.encode(`${ctx.request.method} ${ctx.request.url.pathname} - ${ms}ms\n`));
  });

  // MCP Schema endpoint
  router.get("/schema", (ctx) => {
    ctx.response.body = MCP_SCHEMA;
  });

  // MCP Action endpoint
  router.post("/action", async (ctx) => {
    try {
      const body = await ctx.request.body().value;
      const { action, params } = body;
      
      if (!action) {
        ctx.response.status = 400;
        ctx.response.body = { 
          success: false, 
          message: "Action is required" 
        };
        return;
      }
      
      const result = await handleMCPRequest(action, params || {});
      ctx.response.body = result;
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { 
        success: false, 
        message: `Server error: ${error.message}` 
      };
    }
  });

  // Claude Desktop compatibility route - accepts natural language instructions
  router.post("/query", async (ctx) => {
    try {
      const { prompt } = await ctx.request.body().value;
      
      if (!prompt) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: "Prompt is required"
        };
        return;
      }

      // Get all available data to provide to Claude as context
      const productsResult = await handleMCPRequest("product.list");
      const categoriesResult = await handleMCPRequest("category.list");
      const transactionsResult = await handleMCPRequest("transaction.list");
      
      // For Claude Desktop, return the schema and current data as context
      const recentTransactions = Array.isArray(transactionsResult.data) 
        ? transactionsResult.data.slice(0, 10) 
        : [];
        
      ctx.response.body = {
        success: true,
        schema: MCP_SCHEMA,
        context: {
          products: productsResult.data || [],
          categories: categoriesResult.data || [],
          recent_transactions: recentTransactions
        },
        message: "Use the MCP schema and provided context to process the user's inventory query"
      };
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: `Server error: ${error.message}`
      };
    }
  });

  // Handle direct MCP commands from Claude
  router.post("/claude", async (ctx) => {
    try {
      const body = await ctx.request.body().value;
      let action, params;
      
      if (typeof body === 'string') {
        try {
          // Try to parse the string as JSON if Claude sends it that way
          const parsed = parse(body);
          action = parsed.action;
          params = parsed.params;
        } catch (e) {
          // If not valid JSON, try to parse as "action { params }" format
          const match = body.trim().match(/^([a-z]+\.[a-z]+)(?:\s+(\{.+\}))?$/i);
          if (match) {
            action = match[1];
            params = match[2] ? JSON.parse(match[2]) : {};
          } else {
            // If no match, use the whole string as the action
            action = body.trim();
            params = {};
          }
        }
      } else {
        // If body is already an object
        action = body.action;
        params = body.params || {};
      }
      
      if (!action) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          message: "Action is required"
        };
        return;
      }
      
      const result = await handleMCPRequest(action, params);
      ctx.response.body = result;
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        message: `Server error: ${error.message}`
      };
    }
  });

  // Health check endpoint
  router.get("/health", (ctx) => {
    ctx.response.body = { status: "ok" };
  });

  // Apply router
  app.use(router.routes());
  app.use(router.allowedMethods());

  // Error handling middleware
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { 
        success: false, 
        message: `Internal Server Error: ${error.message}` 
      };
      const encoder = new TextEncoder();
      Deno.stderr.write(encoder.encode(`Server error: ${error.message}\n${error.stack}\n`));
    }
  });

  // Write a message to stderr, not stdout
  const encoder = new TextEncoder();
  Deno.stderr.write(encoder.encode(`MCP Inventory Management server running on http://localhost:${PORT}\n`));

  // Start the server
  await app.listen({ port: PORT });
}

// Start the server
await startServer(); 