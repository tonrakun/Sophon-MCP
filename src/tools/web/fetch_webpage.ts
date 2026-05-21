import { countTokens } from "../../utils/tokens.js";
import { compressText } from "../compress/compress_text.js";

const SOPHON_PRE_COMPRESSED_MARKER = "<!-- _sophon_pre_compressed -->";

export type FetchWebpageInput = {
  url: string;
  max_tokens?: number;
  compress?: boolean;
};

export type FetchWebpageResult =
  | { ok: true; url: string; markdown: string; original_token_count: number; compressed_token_count: number; saved_tokens: number; approximate: true }
  | { ok: false; url: string; error: string };

export async function fetchWebpage(input: FetchWebpageInput): Promise<FetchWebpageResult> {
  const applyCompress = input.compress ?? true;
  try {
    const res = await fetch(input.url, {
      headers: { "User-Agent": "sophon-mcp/0.1" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return { ok: false, url: input.url, error: `HTTP ${res.status} ${res.statusText}` };
    }

    const html = await res.text();
    const md = htmlToMarkdown(html);
    const original_token_count = countTokens(md);
    const max = input.max_tokens ?? 4000;

    let output = md;

    if (applyCompress) {
      output = compressText({ text: output }).compressed;
    }

    // Truncate if still over max
    if (countTokens(output) > max) {
      const lines = output.split("\n");
      let result = "";
      for (const line of lines) {
        const candidate = result ? result + "\n" + line : line;
        if (countTokens(candidate) > max) break;
        result = candidate;
      }
      output = result + "\n…[truncated]";
    }

    const compressed_token_count = countTokens(output);
    // Prepend marker so compress_text can detect double-compression
    output = SOPHON_PRE_COMPRESSED_MARKER + "\n" + output;

    return {
      ok: true,
      url: input.url,
      markdown: output,
      original_token_count,
      compressed_token_count,
      saved_tokens: original_token_count - compressed_token_count,
      approximate: true,
    };
  } catch (e) {
    return { ok: false, url: input.url, error: String(e) };
  }
}

function htmlToMarkdown(html: string): string {
  let text = html;

  // Remove head section
  text = text.replace(/<head[\s\S]*?<\/head>/gi, "");
  // Remove script/style blocks
  text = text.replace(/<(script|style|nav|footer|header|aside)[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // Block-level elements → Markdown
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, c) => `# ${stripTags(c).trim()}\n`);
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, c) => `## ${stripTags(c).trim()}\n`);
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, c) => `### ${stripTags(c).trim()}\n`);
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, c) => `#### ${stripTags(c).trim()}\n`);
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, c) => `##### ${stripTags(c).trim()}\n`);
  text = text.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, c) => `###### ${stripTags(c).trim()}\n`);
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => `${stripTags(c).trim()}\n\n`);
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<hr\s*\/?>/gi, "\n---\n");
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => `- ${stripTags(c).trim()}\n`);
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c) =>
    stripTags(c).trim().split("\n").map((l: string) => `> ${l}`).join("\n") + "\n"
  );
  text = text.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, c) => "```\n" + decodeEntities(c) + "\n```\n");
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => "`" + decodeEntities(c) + "`");

  // Inline elements
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _t, c) => `**${stripTags(c).trim()}**`);
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _t, c) => `_${stripTags(c).trim()}_`);
  text = text.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, c) => `[${stripTags(c).trim()}](${href})`);

  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode entities
  text = decodeEntities(text);

  // Normalize whitespace
  text = text.replace(/[ \t]+$/gm, "").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/[ \t]{2,}/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&apos;/g, "'");
}
