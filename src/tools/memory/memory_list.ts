import { getDb } from "../../db/index.js";
import type { MemoryRow } from "../../db/schema.js";
import type { MemoryEntry } from "./memory_get.js";

export type MemoryListInput = {
  tag?: string;
  search?: string;
};

export type MemoryListResult =
  | { ok: true; memories: MemoryEntry[] }
  | { ok: false; error: string };

export function memoryList(input: MemoryListInput): MemoryListResult {
  try {
    const db = getDb();
    let rows: MemoryRow[];

    if (input.search) {
      rows = db.prepare(
        "SELECT * FROM memories WHERE key LIKE ? OR value LIKE ? ORDER BY updated_at DESC"
      ).all(`%${input.search}%`, `%${input.search}%`) as MemoryRow[];
    } else {
      rows = db.prepare("SELECT * FROM memories ORDER BY updated_at DESC").all() as MemoryRow[];
    }

    let memories = rows.map((r) => ({ ...r, tags: JSON.parse(r.tags) as string[] }));

    if (input.tag) {
      memories = memories.filter((m) => m.tags.includes(input.tag!));
    }

    return { ok: true, memories };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
