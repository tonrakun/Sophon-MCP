#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setRoot } from "./utils/path.js";
import {
  registerFileTools,
  registerMemoryTools,
  registerTaskTools,
  registerCompressTools,
  registerWebTools,
  registerContextTools,
  registerSessionTools,
} from "./tools/index.js";
import { INSTRUCTIONS } from "./instructions.js";

function parseArgs(): { root: string } {
  const args = process.argv.slice(2);
  const rootIndex = args.indexOf("--root");
  if (rootIndex === -1 || !args[rootIndex + 1]) {
    console.error("Usage: sophon-mcp --root <project-root-path>");
    process.exit(1);
  }
  return { root: args[rootIndex + 1] };
}

async function main(): Promise<void> {
  const { root } = parseArgs();
  setRoot(root);

  const server = new McpServer(
    { name: "sophon-mcp", version: "0.1.0" },
    { instructions: INSTRUCTIONS }
  );

  registerFileTools(server);
  registerMemoryTools(server);
  registerTaskTools(server);
  registerCompressTools(server);
  registerWebTools(server);
  registerContextTools(server);
  registerSessionTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
