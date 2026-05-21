import fs from "node:fs";
import { safePath } from "../../utils/path.js";
import { countTokens, makeTokenCount, type TokenCount } from "../../utils/tokens.js";

function titleToAnchor(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

interface Section {
  anchor: string;
  content: string;
}

export interface ReadMarkdownSectionInput {
  path: string;
  anchors: string[];
}

export function readMarkdownSection(input: ReadMarkdownSectionInput): {
  sections: Section[];
  token_count: TokenCount;
} {
  const filePath = safePath(input.path);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Build anchor → start_line map
  type HeadingInfo = { anchor: string; level: number; lineIndex: number };
  const headings: HeadingInfo[] = [];
  const anchorCount = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;
    const level = match[1].length;
    const title = match[2].trim();
    let anchor = titleToAnchor(title);
    const count = anchorCount.get(anchor) ?? 0;
    if (count > 0) anchor = `${anchor}-${count}`;
    anchorCount.set(anchor, count + 1);
    headings.push({ anchor, level, lineIndex: i });
  }

  const requested = new Set(input.anchors);
  const sections: Section[] = [];

  for (let hi = 0; hi < headings.length; hi++) {
    const h = headings[hi];
    if (!requested.has(h.anchor)) continue;

    const start = h.lineIndex;
    let end = lines.length;
    for (let hj = hi + 1; hj < headings.length; hj++) {
      if (headings[hj].level <= h.level) {
        end = headings[hj].lineIndex;
        break;
      }
    }

    sections.push({ anchor: h.anchor, content: lines.slice(start, end).join("\n").trim() });
  }

  const text = sections.map((s) => s.content).join("\n");
  return { sections, token_count: makeTokenCount(countTokens(text)) };
}
