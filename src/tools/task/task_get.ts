import { getStore } from "../../store/index.js";
import type { TaskEntry } from "../../store/index.js";

export type TaskGetInput = { id: number };
export type TaskGetResult =
  | { ok: true; task: TaskEntry }
  | { ok: false; error: string };

export function taskGet(input: TaskGetInput): TaskGetResult {
  try {
    const task = getStore().tasks.find((t) => t.id === input.id);
    if (!task) return { ok: false, error: `Task not found: ${input.id}` };
    return { ok: true, task };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
