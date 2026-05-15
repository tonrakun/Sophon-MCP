import { getStore, commitStore } from "../../store/index.js";
import { readCodeSkeleton } from "../file/read_code_skeleton.js";

export type SessionSnapshotInput = { name?: string };

export type SessionSnapshotResult =
  | {
      ok: true;
      snapshot_id: string;
      name: string;
      saved_at: string;
      summary: { tasks_count: number; memories_count: number; files_count: number };
    }
  | { ok: false; error: string };

export async function sessionSnapshot(input: SessionSnapshotInput): Promise<SessionSnapshotResult> {
  try {
    const store = getStore();
    const saved_at = new Date().toISOString();
    const snapshot_id = `snap_${store.next_snapshot_id++}`;
    const name = input.name ?? saved_at;

    // Collect file skeletons for files accessed in the last 24h (token budget: 2000)
    const cutoff = Math.floor(Date.now() / 1000) - 86400;
    const recentPaths = [...new Set(
      store.file_access_log
        .filter((e) => e.accessed_at >= cutoff)
        .map((e) => e.path)
    )];

    const file_skeletons: { path: string; skeleton: object[] }[] = [];
    let usedTokens = 0;
    for (const fp of recentPaths) {
      if (usedTokens >= 2000) break;
      try {
        const { skeleton, token_count } = await readCodeSkeleton({ path: fp });
        if (usedTokens + token_count > 2000) continue;
        usedTokens += token_count;
        file_skeletons.push({ path: fp, skeleton });
      } catch {
        // skip inaccessible files
      }
    }

    const payload = JSON.stringify({
      tasks: store.tasks,
      memories: store.memories,
      file_skeletons,
    });

    store.session_snapshots.push({ snapshot_id, name, payload, saved_at });
    commitStore();

    return {
      ok: true,
      snapshot_id,
      name,
      saved_at,
      summary: {
        tasks_count: store.tasks.length,
        memories_count: store.memories.length,
        files_count: file_skeletons.length,
      },
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
