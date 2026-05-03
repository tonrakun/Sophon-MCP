import fs from "node:fs";
import { safePath } from "../../utils/path.js";
import { countTokens } from "../../utils/tokens.js";

type SkeletonType = "function" | "class" | "method" | "if" | "for" | "while";

interface SkeletonEntry {
  id: string;
  type: SkeletonType;
  name?: string;
  signature?: string;
  start_line: number;
  end_line: number;
}

// Regex patterns for JS/TS/Python
const PATTERNS: { regex: RegExp; type: SkeletonType }[] = [
  // class declaration
  { regex: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/, type: "class" },
  // function declaration (named)
  { regex: /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*(<[^>]*>)?\s*\(/, type: "function" },
  // arrow function assigned to const/let/var
  { regex: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*\S+\s*)?=\s*(?:async\s+)?\(/, type: "function" },
  // method (indented, inside class) — exclude keywords
  { regex: /^\s+(?:(?:public|private|protected|static|async|override)\s+)*(?!if|for|while|switch|return|throw|new|typeof|instanceof|await)(\w+)\s*(?:<[^>]*>)?\s*\(/, type: "method" },
  // Python def
  { regex: /^(?:\s*)def\s+(\w+)\s*\(/, type: "function" },
  // Python class
  { regex: /^class\s+(\w+)/, type: "class" },
];

const BLOCK_PATTERNS: { regex: RegExp; type: SkeletonType }[] = [
  { regex: /^\s*if\s*\(/, type: "if" },
  { regex: /^\s*for\s*\(/, type: "for" },
  { regex: /^\s*while\s*\(/, type: "while" },
];

function findEndLine(lines: string[], startLine: number): number {
  const startIndent = lines[startLine].match(/^(\s*)/)?.[1].length ?? 0;
  let braceDepth = 0;
  let inBlock = false;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === "{") { braceDepth++; inBlock = true; }
      if (ch === "}") { braceDepth--; }
    }
    if (inBlock && braceDepth === 0) return i;

    // Python-style: indent-based (if no braces encountered)
    if (!inBlock && i > startLine) {
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
      if (line.trim() !== "" && indent <= startIndent) return i - 1;
    }
  }
  return lines.length - 1;
}

export interface ReadCodeSkeletonInput {
  path: string;
  include_blocks?: boolean;
}

export function readCodeSkeleton(input: ReadCodeSkeletonInput): {
  skeleton: SkeletonEntry[];
  token_count: number;
} {
  const filePath = safePath(input.path);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const skeleton: SkeletonEntry[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const { regex, type } of PATTERNS) {
      const match = line.match(regex);
      if (!match) continue;

      const name = match[1];
      const endLine = findEndLine(lines, i);
      const id = `${type === "class" ? "class" : type === "method" ? "method" : "func"}:${i + 1}-${endLine + 1}`;
      const signature = line.trim().replace(/\{?\s*$/, "").trim();

      skeleton.push({ id, type, name, signature, start_line: i + 1, end_line: endLine + 1 });
      processed.add(i);
      break;
    }

    if (input.include_blocks && !processed.has(i)) {
      for (const { regex, type } of BLOCK_PATTERNS) {
        if (line.match(regex)) {
          const endLine = findEndLine(lines, i);
          const id = `${type}:${i + 1}-${endLine + 1}`;
          skeleton.push({ id, type, start_line: i + 1, end_line: endLine + 1 });
          break;
        }
      }
    }
  }

  const text = JSON.stringify(skeleton);
  return { skeleton, token_count: countTokens(text) };
}
