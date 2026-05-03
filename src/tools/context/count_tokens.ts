import { countTokens as _count } from "../../utils/tokens.js";

export type CountTokensInput = {
  text: string;
};

export type CountTokensResult = {
  tokens: number;
  approximate: true;
};

export function countTokensTool(input: CountTokensInput): CountTokensResult {
  return { tokens: _count(input.text), approximate: true };
}
