import { getDb } from "../../db/index.js";

export type MemoryDeleteInput = {
  key: string;
};

export type MemoryDeleteResult =
  | { ok: true; deleted: boolean }
  | { ok: false; error: string };

export function memoryDelete(input: MemoryDeleteInput): MemoryDeleteResult {
  try {
    const db = getDb();
    const result = db.prepare("DELETE FROM memories WHERE key = ?").run(input.key);
    return { ok: true, deleted: result.changes > 0 };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
