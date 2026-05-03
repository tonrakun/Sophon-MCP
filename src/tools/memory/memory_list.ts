import { getStore } from "../../store/index.js";
import type { MemoryEntry } from "../../store/index.js";

export type MemoryListInput = { tag?: string; search?: string };
export type MemoryListResult =
  | { ok: true; memories: MemoryEntry[] }
  | { ok: false; error: string };

export function memoryList(input: MemoryListInput): MemoryListResult {
  try {
    let memories = [...getStore().memories].sort((a, b) => b.updated_at - a.updated_at);
    if (input.tag) memories = memories.filter((m) => m.tags.includes(input.tag!));
    if (input.search) {
      const q = input.search.toLowerCase();
      memories = memories.filter((m) => m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q));
    }
    return { ok: true, memories };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
