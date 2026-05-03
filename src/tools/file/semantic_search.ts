import { spawnSync } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { readCodeSkeleton } from "./read_code_skeleton.js";
import { readCodeBody } from "./read_code_body.js";
import { safePath } from "../../utils/path.js";
import { countTokens } from "../../utils/tokens.js";

export interface SemanticSearchInput {
  path: string;
  query: string;
  max_results?: number;
}

// Empty MCP config to prevent Sophon itself from being loaded recursively
const EMPTY_MCP_CONFIG_PATH = path.join(os.tmpdir(), "sophon-empty-mcp.json");

function ensureEmptyMcpConfig(): string {
  if (!fs.existsSync(EMPTY_MCP_CONFIG_PATH)) {
    fs.writeFileSync(EMPTY_MCP_CONFIG_PATH, JSON.stringify({ mcpServers: {} }), "utf-8");
  }
  return EMPTY_MCP_CONFIG_PATH;
}

export function semanticSearch(input: SemanticSearchInput): {
  matches: Array<{ id: string; name?: string; body: string }>;
  token_count: number;
} {
  // Validate path early
  safePath(input.path);

  const { skeleton } = readCodeSkeleton({ path: input.path, include_blocks: false });
  if (skeleton.length === 0) {
    return { matches: [], token_count: 0 };
  }

  const maxResults = input.max_results ?? 5;
  const entries = skeleton.map((e) => ({ id: e.id, name: e.name, signature: e.signature }));
  const skeletonJson = JSON.stringify(entries, null, 2);

  const prompt =
    `以下はコードファイルの関数・クラス一覧（JSON）です。\n` +
    `クエリ「${input.query}」に最も関連するエントリのIDを最大${maxResults}件選び、` +
    `JSONの配列だけを返してください。説明・コードブロック・改行は不要です。\n` +
    `例: ["func:1-20","func:25-40"]\n\n` +
    `スケルトン:\n${skeletonJson}`;

  const mcpConfig = ensureEmptyMcpConfig();

  const result = spawnSync(
    "claude",
    ["-p", prompt, "--mcp-config", mcpConfig, "--output-format", "text"],
    { encoding: "utf-8", timeout: 30_000 }
  );

  if (result.error) {
    throw new Error(`claude subprocess error: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`claude exited with code ${result.status}: ${result.stderr?.trim()}`);
  }

  const output = (result.stdout ?? "").trim();
  let ids: string[] = [];
  try {
    const arrayMatch = output.match(/\[[\s\S]*?\]/);
    if (arrayMatch) ids = JSON.parse(arrayMatch[0]);
  } catch {
    // leave ids empty — return no matches rather than crashing
  }

  if (ids.length === 0) {
    return { matches: [], token_count: 0 };
  }

  const { blocks } = readCodeBody({ path: input.path, ids });
  const text = blocks.map((b) => b.body).join("\n");
  return { matches: blocks, token_count: countTokens(text) };
}
