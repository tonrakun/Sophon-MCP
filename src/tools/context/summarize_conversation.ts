import { countTokens } from "../../utils/tokens.js";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type SummarizeConversationInput = {
  messages: Message[];
  keep_last?: number;
};

export type SummarizeConversationResult = {
  summary: string;
  kept_messages: Message[];
  original_tokens: number;
  summary_tokens: number;
  approximate: true;
};

export function summarizeConversation(input: SummarizeConversationInput): SummarizeConversationResult {
  const { messages, keep_last = 4 } = input;
  const original_tokens = countTokens(messages.map((m) => m.content).join("\n"));

  const kept = messages.slice(-keep_last);
  const summarized = messages.slice(0, messages.length - kept.length);

  const lines: string[] = [];
  for (const m of summarized) {
    const preview = m.content.slice(0, 200).replace(/\n/g, " ");
    lines.push(`[${m.role}] ${preview}${m.content.length > 200 ? "…" : ""}`);
  }
  const summary = lines.length > 0
    ? `[Conversation summary — ${lines.length} earlier messages]\n` + lines.join("\n")
    : "";

  return {
    summary,
    kept_messages: kept,
    original_tokens,
    summary_tokens: countTokens(summary),
    approximate: true,
  };
}
