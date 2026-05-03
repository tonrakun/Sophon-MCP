import { getDb } from "../../db/index.js";

export type TaskDeleteInput = {
  id: number;
};

export type TaskDeleteResult =
  | { ok: true; deleted: boolean }
  | { ok: false; error: string };

export function taskDelete(input: TaskDeleteInput): TaskDeleteResult {
  try {
    const db = getDb();
    const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(input.id);
    return { ok: true, deleted: result.changes > 0 };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
