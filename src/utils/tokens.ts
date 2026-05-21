import { encode } from "gpt-tokenizer";

export type TokenCount = {
  count: number;
  tokenizer: "cl100k_base";
  approximate: true;
  margin: "±15%";
};

export function countTokens(text: string): number {
  return encode(text).length;
}

export function makeTokenCount(n: number): TokenCount {
  return { count: n, tokenizer: "cl100k_base", approximate: true, margin: "±15%" };
}
