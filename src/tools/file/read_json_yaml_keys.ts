import fs from "node:fs";
import yaml from "js-yaml";
import { safePath } from "../../utils/path.js";
import { countTokens, makeTokenCount, type TokenCount } from "../../utils/tokens.js";

interface KeyEntry {
  path: string;
  type: string;
  preview?: string;
}

function collectKeys(obj: unknown, prefix: string, depth: number, maxDepth: number, result: KeyEntry[]): void {
  if (depth > maxDepth) return;

  if (obj === null) {
    result.push({ path: prefix, type: "null" });
  } else if (Array.isArray(obj)) {
    result.push({ path: prefix, type: "array", preview: `[${obj.length} items]` });
    if (depth < maxDepth && obj.length > 0) {
      collectKeys(obj[0], `${prefix}[0]`, depth + 1, maxDepth, result);
    }
  } else if (typeof obj === "object") {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const keyPath = prefix ? `${prefix}.${key}` : key;
      const valType = Array.isArray(val) ? "array" : typeof val;

      if (val === null) {
        result.push({ path: keyPath, type: "null" });
      } else if (typeof val === "object") {
        result.push({ path: keyPath, type: Array.isArray(val) ? "array" : "object" });
        collectKeys(val, keyPath, depth + 1, maxDepth, result);
      } else {
        const preview = String(val).slice(0, 60);
        result.push({ path: keyPath, type: valType, preview });
      }
    }
  }
}

export interface ReadJsonYamlKeysInput {
  path: string;
  depth?: number;
}

export function readJsonYamlKeys(input: ReadJsonYamlKeysInput): {
  keys?: KeyEntry[];
  raw_content?: string;
  token_count: TokenCount;
} {
  const filePath = safePath(input.path);
  const raw = fs.readFileSync(filePath, "utf-8");

  // For small files, return raw content directly — structured key extraction adds more overhead than it saves
  const rawN = countTokens(raw);
  if (rawN < 300) {
    return { raw_content: raw, token_count: makeTokenCount(rawN) };
  }

  const maxDepth = input.depth ?? 3;

  let parsed: unknown;
  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
    parsed = yaml.load(raw);
  } else {
    parsed = JSON.parse(raw);
  }

  const keys: KeyEntry[] = [];
  collectKeys(parsed, "", 1, maxDepth, keys);

  const text = JSON.stringify(keys);
  return { keys, token_count: makeTokenCount(countTokens(text)) };
}
