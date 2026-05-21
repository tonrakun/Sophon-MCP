import fs from "node:fs";
import { safePath } from "../../utils/path.js";
import { countTokens, makeTokenCount, type TokenCount } from "../../utils/tokens.js";

interface CodeBlock {
  id: string;
  name?: string;
  body: string;
}

function parseId(id: string): { start: number; end: number } | null {
  const match = id.match(/:(\d+)-(\d+)$/);
  if (!match) return null;
  return { start: parseInt(match[1], 10), end: parseInt(match[2], 10) };
}

export interface ReadCodeBodyInput {
  path: string;
  ids: string[];
}

export function readCodeBody(input: ReadCodeBodyInput): {
  blocks: CodeBlock[];
  token_count: TokenCount;
} {
  const filePath = safePath(input.path);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const blocks: CodeBlock[] = [];

  for (const id of input.ids) {
    const range = parseId(id);
    if (!range) {
      blocks.push({ id, body: `Error: invalid id format "${id}"` });
      continue;
    }

    const { start, end } = range;
    if (start < 1 || end > lines.length || start > end) {
      blocks.push({ id, body: `Error: line range ${start}-${end} out of bounds` });
      continue;
    }

    // 1-based line numbers
    const body = lines.slice(start - 1, end).join("\n");

    // Extract name from first line if possible
    const firstLine = lines[start - 1];
    const nameMatch = firstLine.match(/(?:function|class|def)\s+(\w+)/) ??
      firstLine.match(/(?:const|let|var)\s+(\w+)/);
    const name = nameMatch?.[1];

    blocks.push({ id, name, body });
  }

  const text = blocks.map((b) => b.body).join("\n");
  return { blocks, token_count: makeTokenCount(countTokens(text)) };
}
