import { getStore } from "../../store/index.js";
import type { TaskEntry, TaskStatus } from "../../store/index.js";

export type TaskListInput = { status?: TaskStatus; tag?: string };
export type TaskListResult =
  | { ok: true; tasks: TaskEntry[] }
  | { ok: false; error: string };

export function taskList(input: TaskListInput): TaskListResult {
  try {
    const STATUS_ORDER: Record<string, number> = { in_progress: 0, pending: 1, done: 2, cancelled: 3 };
    let tasks = [...getStore().tasks].sort(
      (a, b) =>
        (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1) ||
        b.priority - a.priority ||
        a.created_at - b.created_at
    );
    if (input.status) tasks = tasks.filter((t) => t.status === input.status);
    if (input.tag) tasks = tasks.filter((t) => t.tags.includes(input.tag!));
    return { ok: true, tasks };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
