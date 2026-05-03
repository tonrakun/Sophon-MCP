import { getDb } from "../../db/index.js";
import type { TaskStatus } from "../../db/schema.js";

export type TaskUpdateInput = {
  id: number;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: number;
  due_date?: string | null;
  tags?: string[];
};

export type TaskUpdateResult =
  | { ok: true; updated: boolean }
  | { ok: false; error: string };

export function taskUpdate(input: TaskUpdateInput): TaskUpdateResult {
  try {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.title !== undefined) { fields.push("title = ?"); values.push(input.title); }
    if (input.description !== undefined) { fields.push("description = ?"); values.push(input.description); }
    if (input.status !== undefined) { fields.push("status = ?"); values.push(input.status); }
    if (input.priority !== undefined) { fields.push("priority = ?"); values.push(input.priority); }
    if ("due_date" in input) { fields.push("due_date = ?"); values.push(input.due_date ?? null); }
    if (input.tags !== undefined) { fields.push("tags = ?"); values.push(JSON.stringify(input.tags)); }

    if (fields.length === 0) return { ok: true, updated: false };

    fields.push("updated_at = ?");
    values.push(now);
    values.push(input.id);

    const result = db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    return { ok: true, updated: result.changes > 0 };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
