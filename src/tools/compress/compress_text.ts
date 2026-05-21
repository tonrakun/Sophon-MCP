import { countTokens } from "../../utils/tokens.js";

export type CompressOptions = {
  remove_markdown_noise?: boolean;
  remove_code_comments?: boolean;
  remove_duplicate_lines?: boolean;
  normalize_whitespace?: boolean;
  trim_tool_response?: boolean;
};

export type CompressTextInput = {
  text: string;
  options?: CompressOptions;
};

export type CompressTextResult = {
  compressed: string;
  original_token_count: number;
  compressed_token_count: number;
  saved_tokens: number;
  saved_tokens_detail: {
    markdown_noise: number;
    code_comments: number;
    duplicate_lines: number;
    whitespace: number;
    tool_response: number;
  };
  approximate: true;
  tokenizer_info: { tokenizer: "cl100k_base"; margin: "±15%" };
  pre_compressed_warning?: string;
};

const SOPHON_PRE_COMPRESSED_MARKER = "<!-- _sophon_pre_compressed -->";

export function compressText(input: CompressTextInput): CompressTextResult {
  const isPreCompressed = input.text.startsWith(SOPHON_PRE_COMPRESSED_MARKER);

  const opts: Required<CompressOptions> = {
    remove_markdown_noise: input.options?.remove_markdown_noise ?? true,
    remove_code_comments: input.options?.remove_code_comments ?? false,
    remove_duplicate_lines: input.options?.remove_duplicate_lines ?? true,
    normalize_whitespace: input.options?.normalize_whitespace ?? true,
    trim_tool_response: input.options?.trim_tool_response ?? false,
  };

  const original_token_count = countTokens(input.text);
  let text = input.text;
  let prev: number;
  const detail = { markdown_noise: 0, code_comments: 0, duplicate_lines: 0, whitespace: 0, tool_response: 0 };

  if (opts.remove_markdown_noise) {
    prev = countTokens(text);
    text = text
      // HR lines (---, ***, ___)
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // HTML comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // badge images like [![...](url)](url)
      .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "")
      // plain images ![alt](url)
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "");
    detail.markdown_noise = prev - countTokens(text);
  }

  if (opts.remove_code_comments) {
    prev = countTokens(text);
    text = text
      // single-line // comments (not URLs)
      .replace(/(?<!:)\/\/(?!\/)[^\n]*/g, "")
      // block /* ... */ comments
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // Python/shell # comments (only at line start)
      .replace(/^[ \t]*#[^\n]*/gm, "");
    detail.code_comments = prev - countTokens(text);
  }

  if (opts.remove_duplicate_lines) {
    prev = countTokens(text);
    const lines = text.split("\n");
    const seen = new Set<string>();
    const deduped: string[] = [];
    let consecutiveDup = false;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === "") {
        // preserve blank lines (whitespace step will collapse multiples)
        deduped.push(lines[i]);
        consecutiveDup = false;
        seen.clear();
        continue;
      }
      if (seen.has(trimmed)) {
        consecutiveDup = true;
        continue;
      }
      seen.add(trimmed);
      deduped.push(lines[i]);
      consecutiveDup = false;
    }
    text = deduped.join("\n");
    detail.duplicate_lines = prev - countTokens(text);
  }

  if (opts.normalize_whitespace) {
    prev = countTokens(text);
    text = text
      .replace(/[ \t]+$/gm, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    detail.whitespace = prev - countTokens(text);
  }

  if (opts.trim_tool_response) {
    prev = countTokens(text);
    text = text
      // null values in JSON-like output
      .replace(/^.*:\s*null\s*,?\s*$/gm, "")
      // empty arrays
      .replace(/^.*:\s*\[\]\s*,?\s*$/gm, "")
      // long URLs (>80 chars) replaced with placeholder
      .replace(/https?:\/\/\S{80,}/g, "[url]");
    detail.tool_response = prev - countTokens(text);
  }

  const compressed_token_count = countTokens(text);

  return {
    compressed: text,
    original_token_count,
    compressed_token_count,
    saved_tokens: original_token_count - compressed_token_count,
    saved_tokens_detail: detail,
    approximate: true,
    tokenizer_info: { tokenizer: "cl100k_base", margin: "±15%" },
    ...(isPreCompressed
      ? { pre_compressed_warning: "Input was already compressed by fetch_webpage. Double-compression applied but may reduce quality. Consider using the fetch_webpage output directly." }
      : {}),
  };
}
