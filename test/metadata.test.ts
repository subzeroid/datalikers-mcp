import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const server = JSON.parse(readFileSync(join(ROOT, "server.json"), "utf8"));

// The MCP Registry entry is published from server.json and checks mcpName
// inside the npm package, so the two files have to move together.
describe("registry metadata", () => {
  it("server.json version matches package.json", () => {
    assert.equal(server.version, pkg.version);
    assert.equal(server.packages[0].version, pkg.version);
  });

  it("names line up between package.json and server.json", () => {
    assert.equal(server.name, pkg.mcpName);
    assert.equal(server.packages[0].identifier, pkg.name);
  });

  it("registry description fits the 100-character limit", () => {
    assert.ok(server.description.length <= 100, `${server.description.length} chars`);
  });
});
