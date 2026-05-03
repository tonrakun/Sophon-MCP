import fs from "node:fs";
import { safePath } from "../../utils/path.js";
import { countTokens } from "../../utils/tokens.js";

interface TocEntry {
  level: number;
  title: string;
  anchor: string;
}

function titleToAnchor(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export interface ReadMarkdownTocInput {
  path: string;
}

export function readMarkdownToc(input: ReadMarkdownTocInput): { toc: TocEntry[]; token_count: number } {
  const filePath = safePath(input.path);
  const content = fs.readFileSync(filePath, "utf-8");

  const toc: TocEntry[] = [];
  const anchorCount = new Map<string, number>();

  for (const line of content.split("\n")) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const title = match[2].trim();
    let anchor = titleToAnchor(title);

    const count = anchorCount.get(anchor) ?? 0;
    if (count > 0) anchor = `${anchor}-${count}`;
    anchorCount.set(anchor, count + 1);

    toc.push({ level, title, anchor });
  }

  const text = JSON.stringify(toc);
  return { toc, token_count: countTokens(text) };
}
