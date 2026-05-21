import { spawnSync } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { readCodeSkeleton } from "./read_code_skeleton.js";
import { readCodeBody } from "./read_code_body.js";
import { safePath } from "../../utils/path.js";
import { countTokens, makeTokenCount, type TokenCount } from "../../utils/tokens.js";

export interface SemanticSearchInput {
  path: string;
  query: string;
  max_results?: number;
}

export type SemanticSearchErrorCode =
  | "CLI_NOT_FOUND"
  | "CLI_TIMEOUT"
  | "PARSE_FAILED"
  | "EMPTY_RESULT";

// Empty MCP config to prevent Sophon itself from being loaded recursively
const EMPTY_MCP_CONFIG_PATH = path.join(os.tmpdir(), "sophon-empty-mcp.json");

function ensureEmptyMcpConfig(): string {
  if (!fs.existsSync(EMPTY_MCP_CONFIG_PATH)) {
    fs.writeFileSync(EMPTY_MCP_CONFIG_PATH, JSON.stringify({ mcpServers: {} }), "utf-8");
  }
  return EMPTY_MCP_CONFIG_PATH;
}

export async function semanticSearch(input: SemanticSearchInput): Promise<{
  matches: Array<{ id: string; name?: string; body: string }>;
  token_count: TokenCount;
  error_code?: SemanticSearchErrorCode;
  fallback?: string;
}> {
  const FALLBACK_HINT = "Use search_file as a fallback for keyword-based search.";

  // Validate path early
  safePath(input.path);

  const { skeleton } = await readCodeSkeleton({ path: input.path, include_blocks: false });
  if (skeleton.length === 0) {
    return { matches: [], token_count: makeTokenCount(0), error_code: "EMPTY_RESULT", fallback: FALLBACK_HINT };
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
    const isNotFound = result.error.message.includes("ENOENT") || result.error.message.includes("not found");
    const errorCode: SemanticSearchErrorCode = isNotFound ? "CLI_NOT_FOUND" : "CLI_TIMEOUT";
    return {
      matches: [],
      token_count: makeTokenCount(0),
      error_code: errorCode,
      fallback: FALLBACK_HINT,
    };
  }

  if (result.status !== 0) {
    return {
      matches: [],
      token_count: makeTokenCount(0),
      error_code: "PARSE_FAILED",
      fallback: FALLBACK_HINT,
    };
  }

  const output = (result.stdout ?? "").trim();
  let ids: string[] = [];
  try {
    const arrayMatch = output.match(/\[[\s\S]*?\]/);
    if (arrayMatch) ids = JSON.parse(arrayMatch[0]);
  } catch {
    return {
      matches: [],
      token_count: makeTokenCount(0),
      error_code: "PARSE_FAILED",
      fallback: FALLBACK_HINT,
    };
  }

  if (ids.length === 0) {
    return { matches: [], token_count: makeTokenCount(0), error_code: "EMPTY_RESULT", fallback: FALLBACK_HINT };
  }

  const { blocks } = readCodeBody({ path: input.path, ids });
  const text = blocks.map((b) => b.body).join("\n");
  return { matches: blocks, token_count: makeTokenCount(countTokens(text)) };
}
