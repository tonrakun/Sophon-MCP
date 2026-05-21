import fs from "node:fs";
import yaml from "js-yaml";
import { safePath } from "../../utils/path.js";
import { countTokens, makeTokenCount, type TokenCount } from "../../utils/tokens.js";

function getByPath(obj: unknown, keyPath: string): unknown {
  const parts = keyPath
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export interface ReadJsonYamlValueInput {
  path: string;
  key_paths: string[];
}

export function readJsonYamlValue(input: ReadJsonYamlValueInput): {
  values: { key_path: string; value: unknown }[];
  token_count: TokenCount;
} {
  const filePath = safePath(input.path);
  const raw = fs.readFileSync(filePath, "utf-8");

  let parsed: unknown;
  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
    parsed = yaml.load(raw);
  } else {
    parsed = JSON.parse(raw);
  }

  const values = input.key_paths.map((keyPath) => ({
    key_path: keyPath,
    value: getByPath(parsed, keyPath),
  }));

  const text = JSON.stringify(values);
  return { values, token_count: makeTokenCount(countTokens(text)) };
}
