import { getStore, commitStore } from "../../store/index.js";

export type MemoryDeleteInput = { key: string };
export type MemoryDeleteResult =
  | { ok: true; deleted: boolean }
  | { ok: false; error: string };

export function memoryDelete(input: MemoryDeleteInput): MemoryDeleteResult {
  try {
    const store = getStore();
    const before = store.memories.length;
    store.memories = store.memories.filter((m) => m.key !== input.key);
    const deleted = store.memories.length < before;
    if (deleted) commitStore();
    return { ok: true, deleted };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
