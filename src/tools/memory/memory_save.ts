import { getDb } from "../../db/index.js";

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
    const db = getDb();
    const tags = JSON.stringify(input.tags ?? []);
    const now = Math.floor(Date.now() / 1000);

    const existing = db.prepare("SELECT id FROM memories WHERE key = ?").get(input.key) as { id: number } | undefined;

    if (existing) {
      db.prepare(
        "UPDATE memories SET value = ?, tags = ?, updated_at = ? WHERE key = ?"
      ).run(input.value, tags, now, input.key);
      return { ok: true, id: existing.id, created: false };
    } else {
      const result = db.prepare(
        "INSERT INTO memories (key, value, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      ).run(input.key, input.value, tags, now, now);
      return { ok: true, id: result.lastInsertRowid as number, created: true };
    }
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
