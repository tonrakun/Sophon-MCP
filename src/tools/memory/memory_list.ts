import { getStore, commitStore } from "../../store/index.js";
import type { MemoryEntry } from "../../store/index.js";

export type MemoryListInput = { tag?: string; search?: string; prune?: boolean };

type MemoryEntryWithExpired = MemoryEntry & { expired?: boolean };

export type MemoryListResult =
  | { ok: true; memories: MemoryEntryWithExpired[]; pruned?: number }
  | { ok: false; error: string };

export function memoryList(input: MemoryListInput): MemoryListResult {
  try {
    const store = getStore();
    const nowIso = new Date().toISOString();

    if (input.prune) {
      const before = store.memories.length;
      store.memories = store.memories.filter(
        (m) => m.importance !== "temp" || !m.expires_at || m.expires_at > nowIso
      );
      const pruned = before - store.memories.length;
      if (pruned > 0) commitStore();
      let memories = [...store.memories].sort((a, b) => b.updated_at - a.updated_at);
      if (input.tag) memories = memories.filter((m) => m.tags.includes(input.tag!));
      if (input.search) {
        const q = input.search.toLowerCase();
        memories = memories.filter((m) => m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q));
      }
      return { ok: true, memories, pruned };
    }

    let memories: MemoryEntryWithExpired[] = [...store.memories]
      .sort((a, b) => b.updated_at - a.updated_at)
      .map((m) => ({
        ...m,
        ...(m.expires_at && m.expires_at <= nowIso ? { expired: true } : {}),
      }));
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
