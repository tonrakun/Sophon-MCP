import { getDb } from "../../db/index.js";
import type { TaskRow } from "../../db/schema.js";

export type TaskEntry = {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: number;
  due_date: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
};

export type TaskGetInput = {
  id: number;
};

export type TaskGetResult =
  | { ok: true; task: TaskEntry }
  | { ok: false; error: string };

export function taskGet(input: TaskGetInput): TaskGetResult {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(input.id) as TaskRow | undefined;
    if (!row) return { ok: false, error: `Task not found: ${input.id}` };
    return { ok: true, task: { ...row, tags: JSON.parse(row.tags) as string[] } };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
