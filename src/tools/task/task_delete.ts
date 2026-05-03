import { getStore, commitStore } from "../../store/index.js";

export type TaskDeleteInput = { id: number };
export type TaskDeleteResult =
  | { ok: true; deleted: boolean }
  | { ok: false; error: string };

export function taskDelete(input: TaskDeleteInput): TaskDeleteResult {
  try {
    const store = getStore();
    const before = store.tasks.length;
    store.tasks = store.tasks.filter((t) => t.id !== input.id);
    const deleted = store.tasks.length < before;
    if (deleted) commitStore();
    return { ok: true, deleted };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
