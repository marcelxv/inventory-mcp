// Special MCP protocol handler that prevents any output to stdout
// This ensures the MCP protocol is not corrupted by our application

// Completely disable all console methods to prevent any accidental output
console.log = function() { return undefined; };
console.info = function() { return undefined; };
console.warn = function() { return undefined; };
console.debug = function() { return undefined; };
console.error = function(...args: any[]) {
  // Instead of default behavior, write to stderr directly
  const encoder = new TextEncoder();
  const msg = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  Deno.stderr.write(encoder.encode(msg + '\n'));
  return undefined;
};

// Disable stdout completely by overriding Deno.stdout.write
// This is critical for MCP protocol compliance
Deno.stdout.write = function(): Promise<number> {
  // Return a successful write but don't actually write anything
  return Promise.resolve(0);
};

// Use this to write diagnostic information to stderr
export function mcpLog(message: string): void {
  // Write directly to stderr
  const encoder = new TextEncoder();
  Deno.stderr.write(encoder.encode(message + "\n"));
}

// Initialize - only called when imported
function initializeMcpEnvironment(): void {
  // Using Deno.stderr.write directly to avoid any issues
  const encoder = new TextEncoder();
  Deno.stderr.write(encoder.encode("MCP protocol handler initialized\n"));
}

// Call initialization immediately
initializeMcpEnvironment();

// Add an unhandled exception handler to prevent crashes
self.addEventListener("error", (event) => {
  const encoder = new TextEncoder();
  Deno.stderr.write(encoder.encode(`Unhandled error: ${event.error}\n`));
}); 