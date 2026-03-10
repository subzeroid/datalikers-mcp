import { spawn, type ChildProcess } from "node:child_process";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

const SERVER_PATH = resolve(import.meta.dirname, "../dist/index.js");
const API_KEY = process.env.DATALIKERS_API_KEY;

function sendJsonRpc(
  proc: ChildProcess,
  message: Record<string, unknown>
): void {
  proc.stdin!.write(JSON.stringify(message) + "\n");
}

function collectResponses(
  proc: ChildProcess,
  count: number,
  timeoutMs = 15000
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const results: Record<string, unknown>[] = [];
    let buffer = "";
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for ${count} responses, got ${results.length}`)),
      timeoutMs
    );
    proc.stdout!.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines) {
        if (line.trim()) {
          results.push(JSON.parse(line));
          if (results.length >= count) {
            clearTimeout(timer);
            resolve(results);
          }
        }
      }
    });
  });
}

describe("datalikers-mcp missing API key", () => {
  it("exits with error when DATALIKERS_API_KEY is not set", async () => {
    const proc = spawn("node", [SERVER_PATH], {
      env: { ...process.env, DATALIKERS_API_KEY: "" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const code = await new Promise<number | null>((resolve) =>
      proc.on("close", resolve)
    );
    assert.equal(code, 1);
  });

  it("prints helpful error message to stderr", async () => {
    const proc = spawn("node", [SERVER_PATH], {
      env: { ...process.env, DATALIKERS_API_KEY: "" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stderr = "";
    proc.stderr!.on("data", (d: Buffer) => (stderr += d.toString()));
    await new Promise<void>((resolve) => proc.on("close", resolve));
    assert.match(stderr, /DATALIKERS_API_KEY/);
    assert.match(stderr, /datalikers\.com/);
  });
});

describe("datalikers-mcp proxy (integration)", { skip: !API_KEY }, () => {
  let proc: ChildProcess;

  before(() => {
    proc = spawn("node", [SERVER_PATH], {
      env: { ...process.env, DATALIKERS_API_KEY: API_KEY },
      stdio: ["pipe", "pipe", "pipe"],
    });
  });

  after(() => {
    proc?.kill();
  });

  it("initializes MCP protocol", async () => {
    sendJsonRpc(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test", version: "0.1.0" },
      },
    });

    const [response] = await collectResponses(proc, 1);
    assert.equal(response.jsonrpc, "2.0");
    assert.equal(response.id, 1);

    const result = response.result as Record<string, unknown>;
    assert.ok(result.protocolVersion);
    assert.ok(result.capabilities);
    assert.ok(result.serverInfo);
  });

  it("lists tools from remote server", async () => {
    sendJsonRpc(proc, { jsonrpc: "2.0", method: "notifications/initialized" });
    sendJsonRpc(proc, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });

    const [response] = await collectResponses(proc, 1);
    assert.equal(response.id, 2);

    const result = response.result as { tools: Array<{ name: string }> };
    assert.ok(Array.isArray(result.tools));
    assert.ok(result.tools.length > 0, "Should have at least one tool");

    const toolNames = result.tools.map((t) => t.name);
    assert.ok(toolNames.includes("get_user_by_username"));
    assert.ok(toolNames.includes("search_users"));
    assert.ok(toolNames.includes("get_stats"));
  });

  it("calls get_stats tool", async () => {
    sendJsonRpc(proc, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "get_stats", arguments: {} },
    });

    const [response] = await collectResponses(proc, 1);
    assert.equal(response.id, 3);

    const result = response.result as {
      content: Array<{ type: string; text: string }>;
    };
    assert.ok(Array.isArray(result.content));
    assert.equal(result.content[0].type, "text");

    const stats = JSON.parse(result.content[0].text);
    assert.ok(typeof stats === "object");
  });

  it("calls get_user_by_username tool", async () => {
    sendJsonRpc(proc, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "get_user_by_username", arguments: { username: "instagram" } },
    });

    const [response] = await collectResponses(proc, 1);
    assert.equal(response.id, 4);

    const result = response.result as {
      content: Array<{ type: string; text: string }>;
    };
    assert.ok(Array.isArray(result.content));
    assert.equal(result.content[0].type, "text");
  });

  it("handles unknown tool gracefully", async () => {
    sendJsonRpc(proc, {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "nonexistent_tool", arguments: {} },
    });

    const [response] = await collectResponses(proc, 1);
    assert.equal(response.id, 5);
    // Should return an error (either MCP error or tool error)
    assert.ok(response.error || response.result);
  });
});
