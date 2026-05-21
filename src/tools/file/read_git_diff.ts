import { execSync } from "node:child_process";
import { safePath, getRoot } from "../../utils/path.js";
import { countTokens, makeTokenCount, type TokenCount } from "../../utils/tokens.js";
import { compressText } from "../compress/compress_text.js";

export interface ReadGitDiffInput {
  path?: string;
  from?: string;
  to?: string;
  compress?: boolean;
}

export function readGitDiff(input: ReadGitDiffInput): {
  diff: string;
  token_count: TokenCount;
  stat_omitted: boolean;
  changed_lines: number;
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

    const statOmitted = changedLines < 20;
    let output = "";
    if (!statOmitted && stat.trim()) output += `## Summary\n${stat.trim()}\n\n## Diff\n`;
    output += diff;

    if (input.compress) {
      output = compressText({ text: output }).compressed;
    }

    return {
      diff: output,
      token_count: makeTokenCount(countTokens(output)),
      stat_omitted: statOmitted,
      changed_lines: changedLines,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`git diff failed: ${msg}`);
  }
}
