import { execSync } from "node:child_process";
import { safePath, getRoot } from "../../utils/path.js";
import { countTokens } from "../../utils/tokens.js";
import { compressText } from "../compress/compress_text.js";

export interface ReadGitDiffInput {
  path?: string;
  from?: string;
  to?: string;
  compress?: boolean;
}

export function readGitDiff(input: ReadGitDiffInput): {
  diff: string;
  token_count: number;
} {
  const root = getRoot();
  const targetPath = input.path ? safePath(input.path) : root;

  const range =
    input.from && input.to ? `${input.from}..${input.to}` :
    input.from ? `${input.from}..HEAD` :
    input.to ? `HEAD..${input.to}` :
    "";

  try {
    const statCmd = `git -C "${root}" diff --stat -U3 ${range} -- "${targetPath}"`;
    const diffCmd = `git -C "${root}" diff -U3 ${range} -- "${targetPath}"`;

    const stat = execSync(statCmd, { encoding: "utf-8", timeout: 15000 });
    const diff = execSync(diffCmd, { encoding: "utf-8", timeout: 15000 });

    // Count changed lines (+ or - lines, excluding file headers)
    const changedLines = diff.split("\n").filter(
      (l) => (l.startsWith("+") || l.startsWith("-")) && !l.startsWith("+++") && !l.startsWith("---")
    ).length;

    let output = "";
    // Only include stat summary for large diffs (≥20 changed lines); for small diffs it adds overhead
    if (changedLines >= 20 && stat.trim()) output += `## Summary\n${stat.trim()}\n\n## Diff\n`;
    output += diff;

    if (input.compress) {
      output = compressText({ text: output }).compressed;
    }

    return { diff: output, token_count: countTokens(output) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`git diff failed: ${msg}`);
  }
}
