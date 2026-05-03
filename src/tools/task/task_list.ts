import { getDb } from "../../db/index.js";
import type { TaskRow, TaskStatus } from "../../db/schema.js";
import type { TaskEntry } from "./task_get.js";

export type TaskListInput = {
  status?: TaskStatus;
  tag?: string;
};

export type TaskListResult =
  | { ok: true; tasks: TaskEntry[] }
  | { ok: false; error: string };

export function taskList(input: TaskListInput): TaskListResult {
  try {
    const db = getDb();
    let rows: TaskRow[];

    if (input.status) {
      rows = db.prepare(
        "SELECT * FROM tasks WHERE status = ? ORDER BY priority DESC, created_at ASC"
      ).all(input.status) as TaskRow[];
    } else {
      rows = db.prepare(
        "SELECT * FROM tasks ORDER BY priority DESC, created_at ASC"
      ).all() as TaskRow[];
    }

    let tasks = rows.map((r) => ({ ...r, tags: JSON.parse(r.tags) as string[] }));

    if (input.tag) {
      tasks = tasks.filter((t) => t.tags.includes(input.tag!));
    }

    return { ok: true, tasks };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
