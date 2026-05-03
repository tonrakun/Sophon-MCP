import fs from "node:fs";
import path from "node:path";
import ignore, { type Ignore } from "ignore";
import { safePath, getRoot, toRelative } from "../../utils/path.js";
import { countTokens } from "../../utils/tokens.js";

const ALWAYS_IGNORE = [".git", "node_modules", ".sophon", "dist", ".serena"];

function loadGitignore(dir: string): Ignore {
  const ig = ignore().add(ALWAYS_IGNORE);
  const gitignorePath = path.join(dir, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    ig.add(fs.readFileSync(gitignorePath, "utf-8"));
  }
  return ig;
}

function buildTree(
  dir: string,
  root: string,
  ig: Ignore,
  depth: number,
  maxDepth: number,
  prefix: string
): string[] {
  if (depth > maxDepth) return [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const filtered = entries.filter((e) => {
    const rel = toRelative(path.join(dir, e.name));
    return !ig.ignores(rel);
  });

  filtered.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const lines: string[] = [];
  filtered.forEach((entry, i) => {
    const isLast = i === filtered.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";
    lines.push(prefix + connector + entry.name + (entry.isDirectory() ? "/" : ""));

    if (entry.isDirectory()) {
      const childDir = path.join(dir, entry.name);
      const childLines = buildTree(childDir, root, ig, depth + 1, maxDepth, prefix + childPrefix);
      lines.push(...childLines);
    }
  });

  return lines;
}

export interface ReadDirectoryTreeInput {
  path?: string;
  depth?: number;
}

export function readDirectoryTree(input: ReadDirectoryTreeInput): { tree: string; token_count: number } {
  const root = getRoot();
  const targetPath = input.path ? safePath(input.path) : root;
  const maxDepth = input.depth ?? 3;

  const ig = loadGitignore(root);
  const relTarget = path.relative(root, targetPath) || ".";
  const lines = [relTarget + "/", ...buildTree(targetPath, root, ig, 1, maxDepth, "")];
  const tree = lines.join("\n");

  return { tree, token_count: countTokens(tree) };
}
