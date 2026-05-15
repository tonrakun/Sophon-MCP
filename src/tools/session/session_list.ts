import { getStore } from "../../store/index.js";

export type SessionListInput = { limit?: number };

export type SessionListResult =
  | {
      ok: true;
      snapshots: {
        snapshot_id: string;
        name: string;
        saved_at: string;
        summary: { tasks_count: number; memories_count: number; files_count: number };
      }[];
    }
  | { ok: false; error: string };

export function sessionList(input: SessionListInput): SessionListResult {
  try {
    const store = getStore();
    const limit = input.limit ?? 10;

    const snapshots = [...store.session_snapshots]
      .sort((a, b) => b.saved_at.localeCompare(a.saved_at))
      .slice(0, limit)
      .map((s) => {
        let payload: { tasks?: unknown[]; memories?: unknown[]; file_skeletons?: unknown[] } = {};
        try { payload = JSON.parse(s.payload); } catch { /* ignore */ }
        return {
          snapshot_id: s.snapshot_id,
          name: s.name,
          saved_at: s.saved_at,
          summary: {
            tasks_count: payload.tasks?.length ?? 0,
            memories_count: payload.memories?.length ?? 0,
            files_count: payload.file_skeletons?.length ?? 0,
          },
        };
      });

    return { ok: true, snapshots };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
