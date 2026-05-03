import { getStore } from "../../store/index.js";
import type { MemoryEntry } from "../../store/index.js";

export type MemoryGetInput = { key: string };
export type MemoryGetResult =
  | { ok: true; memory: MemoryEntry }
  | { ok: false; error: string };

export function memoryGet(input: MemoryGetInput): MemoryGetResult {
  try {
    const entry = getStore().memories.find((m) => m.key === input.key);
    if (!entry) return { ok: false, error: `Memory not found: ${input.key}` };
    return { ok: true, memory: entry };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
