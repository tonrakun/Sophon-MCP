import { getStore, commitStore, now } from "../../store/index.js";
import type { TaskStatus } from "../../store/index.js";

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
    const store = getStore();
    const ts = now();
    const id = store.next_task_id++;
    const status: TaskStatus = "pending";
    store.tasks.push({
      id,
      title: input.title,
      description: input.description ?? "",
      status,
      priority: input.priority ?? 0,
      due_date: input.due_date ?? null,
      tags: input.tags ?? [],
      created_at: ts,
      updated_at: ts,
    });
    commitStore();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
