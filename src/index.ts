#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.DATALIKERS_API_KEY;
const BASE_URL =
  process.env.DATALIKERS_URL ?? "https://mcp.datalikers.com/mcp/";

if (!API_KEY) {
  process.stderr.write(
    "Error: DATALIKERS_API_KEY environment variable is required.\n" +
      "Get your API key at https://datalikers.com\n"
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const remote = new Client({ name: "datalikers-mcp", version: "1.0.0" });

  await remote.connect(
    new StreamableHTTPClientTransport(new URL(BASE_URL), {
      requestInit: {
        headers: { Authorization: `Bearer ${API_KEY}` },
      },
    })
  );

  const { tools } = await remote.listTools();

  const server = new Server(
    { name: "datalikers", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { content, isError } = await remote.callTool({
      name: request.params.name,
      arguments: request.params.arguments,
    });
    return { content, ...(isError !== undefined && { isError }) };
  });

  await server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Failed to start datalikers-mcp: ${message}\n`);
  process.exit(1);
});
