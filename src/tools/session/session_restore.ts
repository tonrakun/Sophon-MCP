import { getStore } from "../../store/index.js";
import { countTokens, makeTokenCount, type TokenCount } from "../../utils/tokens.js";

export type SessionRestoreInput = { snapshot_id?: string };

export type SessionRestoreResult =
  | {
      ok: true;
      snapshot_id: string;
      name: string;
      saved_at: string;
      tasks: { id: number; title: string; status: string; note?: string }[];
      memories: { key: string; value: unknown; tags: string[] }[];
      file_skeletons: { path: string; skeleton: object[] }[];
      token_count: TokenCount;
    }
  | { ok: false; error: string };

export function sessionRestore(input: SessionRestoreInput): SessionRestoreResult {
  try {
    const store = getStore();
    let snapshot;

    if (input.snapshot_id) {
      snapshot = store.session_snapshots.find((s) => s.snapshot_id === input.snapshot_id);
    } else {
      snapshot = [...store.session_snapshots].sort((a, b) => b.saved_at.localeCompare(a.saved_at))[0];
    }

    if (!snapshot) {
      return { ok: false, error: "Snapshot not found" };
    }

    const payload = JSON.parse(snapshot.payload) as {
      tasks: { id: number; title: string; status: string; note?: string }[];
      memories: { key: string; value: unknown; tags: string[] }[];
      file_skeletons?: { path: string; skeleton: object[] }[];
    };

    const tasks = (payload.tasks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      ...(t.note ? { note: t.note } : {}),
    }));

    const memories = (payload.memories ?? []).map((m) => ({
      key: m.key,
      value: m.value,
      tags: m.tags ?? [],
    }));

    const file_skeletons = payload.file_skeletons ?? [];
    const token_count = makeTokenCount(countTokens(JSON.stringify({ tasks, memories, file_skeletons })));

    return {
      ok: true,
      snapshot_id: snapshot.snapshot_id,
      name: snapshot.name,
      saved_at: snapshot.saved_at,
      tasks,
      memories,
      file_skeletons,
      token_count,
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
