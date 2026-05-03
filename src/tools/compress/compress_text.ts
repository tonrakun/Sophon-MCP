import { countTokens } from "../../utils/tokens.js";

export type CompressTextInput = {
  text: string;
  max_tokens?: number;
};

export type CompressTextResult = {
  text: string;
  original_tokens: number;
  compressed_tokens: number;
  approximate: true;
};

export function compressText(input: CompressTextInput): CompressTextResult {
  const original = input.text;
  const original_tokens = countTokens(original);
  const max = input.max_tokens ?? 2000;

  let compressed = original
    // collapse repeated blank lines
    .replace(/\n{3,}/g, "\n\n")
    // strip trailing whitespace on each line
    .replace(/[ \t]+$/gm, "")
    // collapse repeated spaces
    .replace(/[ \t]{2,}/g, " ");

  // If still over max_tokens, truncate by lines until under limit
  if (countTokens(compressed) > max) {
    const lines = compressed.split("\n");
    let result = "";
    for (const line of lines) {
      const candidate = result ? result + "\n" + line : line;
      if (countTokens(candidate) > max) break;
      result = candidate;
    }
    compressed = result + (result !== compressed ? "\n…[truncated]" : "");
  }

  return {
    text: compressed,
    original_tokens,
    compressed_tokens: countTokens(compressed),
    approximate: true,
  };
}
