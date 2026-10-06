import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENTRY = join(ROOT, "src", "index.ts");

const KEY = process.env.DATALIKERS_API_KEY;

describe(
  "datalikers-mcp e2e (real remote MCP)",
  { skip: !KEY ? "DATALIKERS_API_KEY not set — skipping e2e" : false },
  () => {
    let client: TestClient;

    before(async () => {
      client = await spawnServer({ DATALIKERS_API_KEY: KEY! });
      await client.request("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "e2e", version: "0" },
      }, 30_000);
      client.notify("notifications/initialized", {});
    });

    after(async () => {
      await client?.close();
    });

    it("proxies tools/list from the remote MCP server", async () => {
      const res = (await client.request("tools/list", {}, 30_000)) as {
        tools: Array<{ name: string }>;
      };
      assert.ok(
        res.tools.length >= 20,
        `expected >= 20 proxied tools, got ${res.tools.length}`,
      );
      assert.ok(
        res.tools.some((t) => t.name === "get_user_by_username"),
        "expected get_user_by_username in proxied tool list",
      );
    });

    it("fetches a real Instagram profile via the remote MCP", async () => {
      const res = (await client.request(
        "tools/call",
        { name: "get_user_by_username", arguments: { username: "instagram" } },
        60_000,
      )) as { content: Array<{ text: string }>; isError?: boolean };

      assert.ok(
        !res.isError,
        `tool call errored: ${res.content?.[0]?.text?.slice(0, 200)}`,
      );
      const text = res.content[0].text;
      assert.ok(text.length > 200, `response too small: ${text.length} bytes`);
      const payload = JSON.parse(text);
      // The hosted server wraps user-generated content in an envelope
      // ({ _untrusted, _warning, data }) so agents treat it as untrusted.
      const user = payload.data ?? payload.user ?? payload;
      assert.equal(user.username, "instagram");
    });
  },
);

interface TestClient {
  request(method: string, params: unknown, timeoutMs?: number): Promise<unknown>;
  notify(method: string, params: unknown): void;
  close(): Promise<void>;
}

async function spawnServer(env: Record<string, string>): Promise<TestClient> {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", ENTRY],
    {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    },
  ) as ChildProcessWithoutNullStreams;

  let buffer = "";
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }
  >();

  child.stdout.setEncoding("utf-8");
  child.stdout.on("data", (chunk: string) => {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line) as {
          id?: number;
          result?: unknown;
          error?: { message: string };
        };
        if (typeof msg.id === "number" && pending.has(msg.id)) {
          const entry = pending.get(msg.id)!;
          pending.delete(msg.id);
          clearTimeout(entry.timer);
          if (msg.error) entry.reject(new Error(msg.error.message));
          else entry.resolve(msg.result);
        }
      } catch {
        /* ignore */
      }
    }
  });

  child.stderr.setEncoding("utf-8");
  child.stderr.on("data", () => {
    /* datalikers-mcp is silent on stderr */
  });

  // Give the proxy process a moment to connect to the upstream remote MCP.
  await new Promise((r) => setTimeout(r, 500));

  function send(obj: unknown): void {
    child.stdin.write(JSON.stringify(obj) + "\n");
  }

  return {
    request(method, params, timeoutMs = 30_000) {
      const id = nextId++;
      return new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`${method} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        send({ jsonrpc: "2.0", id, method, params });
      });
    },
    notify(method, params) {
      send({ jsonrpc: "2.0", method, params });
    },
    async close() {
      for (const entry of pending.values()) clearTimeout(entry.timer);
      pending.clear();
      child.stdin.end();
      child.kill("SIGTERM");
      await once(child, "exit");
    },
  };
}
