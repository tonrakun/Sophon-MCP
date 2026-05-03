import { countTokens } from "../../utils/tokens.js";

export type FetchWebpageInput = {
  url: string;
  max_tokens?: number;
};

export type FetchWebpageResult =
  | { ok: true; url: string; text: string; tokens: number; approximate: true }
  | { ok: false; url: string; error: string };

export async function fetchWebpage(input: FetchWebpageInput): Promise<FetchWebpageResult> {
  try {
    const res = await fetch(input.url, {
      headers: { "User-Agent": "sophon-mcp/0.1" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return { ok: false, url: input.url, error: `HTTP ${res.status} ${res.statusText}` };
    }

    const html = await res.text();
    const text = htmlToText(html);
    const max = input.max_tokens ?? 4000;

    let output = text;
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

    return { ok: true, url: input.url, text: output, tokens: countTokens(output), approximate: true };
  } catch (e) {
    return { ok: false, url: input.url, error: String(e) };
  }
}

function htmlToText(html: string): string {
  return html
    // remove script/style blocks
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    // remove HTML tags
    .replace(/<[^>]+>/g, " ")
    // decode basic entities
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    // collapse whitespace
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
