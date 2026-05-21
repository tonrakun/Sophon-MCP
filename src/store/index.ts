import fs from "node:fs";
import path from "node:path";
import { getRoot } from "../utils/path.js";

export type MemoryEntry = {
  id: number;
  key: string;
  value: string;
  tags: string[];
  importance: "permanent" | "temp";
  created_at: number;
  updated_at: number;
  expires_at?: string | null;
};

export type TaskStatus = "pending" | "in_progress" | "done" | "cancelled";

export type TaskEntry = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  due_date: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
};

export type SnapshotEntry = {
  snapshot_id: string;
  name: string;
  payload: string; // JSON: { tasks, memories, file_skeletons }
  saved_at: string; // ISO timestamp
};

export type FileAccessEntry = {
  path: string;
  accessed_at: number; // unix timestamp
};

type StoreData = {
  memories: MemoryEntry[];
  tasks: TaskEntry[];
  next_memory_id: number;
  next_task_id: number;
  session_snapshots: SnapshotEntry[];
  next_snapshot_id: number;
  file_access_log: FileAccessEntry[];
};

const DEFAULT: StoreData = {
  memories: [],
  tasks: [],
  next_memory_id: 1,
  next_task_id: 1,
  session_snapshots: [],
  next_snapshot_id: 1,
  file_access_log: [],
};

let _storeDir: string | null = null;
let _data: StoreData | null = null;

function storeDir(): string {
  if (!_storeDir) {
    _storeDir = path.join(getRoot(), ".sophon");
    fs.mkdirSync(_storeDir, { recursive: true });
  }
  return _storeDir;
}

function storePath(): string {
  return path.join(storeDir(), "store.json");
}

function migrate(data: StoreData): StoreData {
  if (!data.session_snapshots) data.session_snapshots = [];
  if (!data.next_snapshot_id) data.next_snapshot_id = 1;
  if (!data.file_access_log) data.file_access_log = [];
  // v1.3.0: backfill importance — existing records are all permanent
  for (const m of data.memories) {
    if (!m.importance) (m as MemoryEntry).importance = "permanent";
  }
  return data;
}

function load(): StoreData {
  if (_data) return _data;
  const p = storePath();
  if (fs.existsSync(p)) {
    try {
      _data = migrate(JSON.parse(fs.readFileSync(p, "utf-8")) as StoreData);
    } catch {
      _data = structuredClone(DEFAULT);
    }
  } else {
    _data = structuredClone(DEFAULT);
  }
  return _data;
}

function save(): void {
  fs.writeFileSync(storePath(), JSON.stringify(_data, null, 2), "utf-8");
}

export function getStore(): StoreData {
  return load();
}

export function commitStore(): void {
  save();
}

export function now(): number {
  return Math.floor(Date.now() / 1000);
}

export function addFileAccess(filePath: string): void {
  const store = getStore();
  const ts = now();
  store.file_access_log = store.file_access_log.filter((e) => e.path !== filePath);
  store.file_access_log.unshift({ path: filePath, accessed_at: ts });
  if (store.file_access_log.length > 100) {
    store.file_access_log = store.file_access_log.slice(0, 100);
  }
}
