import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";
import { registerTools } from "./tools/dashboard.js";

// ─── Server Initialization ────────────────────────────────────────────────────

const server = new McpServer({
  name: "databox-executive-mcp",
  version: "1.0.0",
});

// Register all tools
registerTools(server);

// ─── Transport: HTTP (remote, for Claude.ai MCP integration) ─────────────────

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      server: "databox-executive-mcp",
      version: "1.0.0",
      description:
        "Revenue Institute Executive Dashboard Architect for Databox",
    });
  });

  // MCP endpoint
  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT ?? "3000");
  app.listen(port, () => {
    console.error(
      `[databox-executive-mcp] Running on http://localhost:${port}/mcp`
    );
    console.error(
      `[databox-executive-mcp] Health: http://localhost:${port}/health`
    );
    console.error(
      `[databox-executive-mcp] Revenue Institute Executive Dashboard Architect v1.0.0`
    );
  });
}

// ─── Transport: stdio (local, for Claude Desktop / MCP Inspector) ─────────────

async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[databox-executive-mcp] Running on stdio");
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

const transport = process.env.TRANSPORT ?? "stdio";

if (transport === "http") {
  runHTTP().catch((error: unknown) => {
    console.error("[databox-executive-mcp] Fatal error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error: unknown) => {
    console.error("[databox-executive-mcp] Fatal error:", error);
    process.exit(1);
  });
}
