import { getStore, commitStore, now } from "../../store/index.js";
import type { TaskStatus } from "../../store/index.js";

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
    const store = getStore();
    const task = store.tasks.find((t) => t.id === input.id);
    if (!task) return { ok: false, error: `Task not found: ${input.id}` };

    if (input.title !== undefined) task.title = input.title;
    if (input.description !== undefined) task.description = input.description;
    if (input.status !== undefined) task.status = input.status;
    if (input.priority !== undefined) task.priority = input.priority;
    if ("due_date" in input) task.due_date = input.due_date ?? null;
    if (input.tags !== undefined) task.tags = input.tags;
    task.updated_at = now();

    commitStore();
    return { ok: true, updated: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
