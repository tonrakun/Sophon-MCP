import { getDb } from "../../db/index.js";
import type { TaskStatus } from "../../db/schema.js";

export type TaskCreateInput = {
  title: string;
  description?: string;
  priority?: number;
  due_date?: string;
  tags?: string[];
};

export type TaskCreateResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

export function taskCreate(input: TaskCreateInput): TaskCreateResult {
  try {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const tags = JSON.stringify(input.tags ?? []);
    const status: TaskStatus = "pending";
    const result = db.prepare(
      "INSERT INTO tasks (title, description, status, priority, due_date, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      input.title,
      input.description ?? "",
      status,
      input.priority ?? 0,
      input.due_date ?? null,
      tags,
      now,
      now
    );
    return { ok: true, id: result.lastInsertRowid as number };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
