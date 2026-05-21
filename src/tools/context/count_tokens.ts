import { countTokens as _count } from "../../utils/tokens.js";

export type CountTokensInput = {
  text: string;
};

export type CountTokensResult = {
  tokens: number;
  tokenizer: "cl100k_base";
  approximate: true;
  margin: "±15%";
};

export function countTokensTool(input: CountTokensInput): CountTokensResult {
  return {
    tokens: _count(input.text),
    tokenizer: "cl100k_base",
    approximate: true,
    margin: "±15%",
  };
}
