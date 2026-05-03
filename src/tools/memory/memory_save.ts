import { getStore, commitStore, now } from "../../store/index.js";

export type MemorySaveInput = {
  key: string;
  value: string;
  tags?: string[];
};

export type MemorySaveResult =
  | { ok: true; id: number; created: boolean }
  | { ok: false; error: string };

export function memorySave(input: MemorySaveInput): MemorySaveResult {
  try {
    const store = getStore();
    const ts = now();
    const existing = store.memories.find((m) => m.key === input.key);
    if (existing) {
      existing.value = input.value;
      existing.tags = input.tags ?? existing.tags;
      existing.updated_at = ts;
      commitStore();
      return { ok: true, id: existing.id, created: false };
    } else {
      const id = store.next_memory_id++;
      store.memories.push({ id, key: input.key, value: input.value, tags: input.tags ?? [], created_at: ts, updated_at: ts });
      commitStore();
      return { ok: true, id, created: true };
    }
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
