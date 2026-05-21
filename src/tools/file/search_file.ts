import fs from "node:fs";
import { safePath } from "../../utils/path.js";
import { countTokens, makeTokenCount, type TokenCount } from "../../utils/tokens.js";

interface Match {
  line: number;
  content: string;
  context: string[];
}

export interface SearchFileInput {
  path: string;
  query: string;
  context_lines?: number;
}

export function searchFile(input: SearchFileInput): {
  matches: Match[];
  token_count: TokenCount;
} {
  const filePath = safePath(input.path);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const contextLines = input.context_lines ?? 2;

  let regex: RegExp;
  try {
    regex = new RegExp(input.query, "i");
  } catch {
    regex = new RegExp(input.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  const matches: Match[] = [];
  const includedLines = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (!regex.test(lines[i])) continue;

    const start = Math.max(0, i - contextLines);
    const end = Math.min(lines.length - 1, i + contextLines);
    const context: string[] = [];

    for (let j = start; j <= end; j++) {
      if (j !== i) context.push(`${j + 1}: ${lines[j]}`);
      includedLines.add(j);
    }

    matches.push({ line: i + 1, content: lines[i], context });
  }

  const text = matches.map((m) => [m.content, ...m.context].join("\n")).join("\n---\n");
  return { matches, token_count: makeTokenCount(countTokens(text)) };
}
