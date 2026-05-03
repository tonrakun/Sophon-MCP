import { getDb } from "../../db/index.js";
import type { MemoryRow } from "../../db/schema.js";

export type MemoryGetInput = {
  key: string;
};

export type MemoryEntry = {
  id: number;
  key: string;
  value: string;
  tags: string[];
  created_at: number;
  updated_at: number;
};

export type MemoryGetResult =
  | { ok: true; memory: MemoryEntry }
  | { ok: false; error: string };

export function memoryGet(input: MemoryGetInput): MemoryGetResult {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM memories WHERE key = ?").get(input.key) as MemoryRow | undefined;
    if (!row) return { ok: false, error: `Memory not found: ${input.key}` };
    return {
      ok: true,
      memory: { ...row, tags: JSON.parse(row.tags) as string[] },
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
