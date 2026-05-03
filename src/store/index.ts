import fs from "node:fs";
import path from "node:path";
import { getRoot } from "../utils/path.js";

export type MemoryEntry = {
  id: number;
  key: string;
  value: string;
  tags: string[];
  created_at: number;
  updated_at: number;
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

type StoreData = {
  memories: MemoryEntry[];
  tasks: TaskEntry[];
  next_memory_id: number;
  next_task_id: number;
};

const DEFAULT: StoreData = {
  memories: [],
  tasks: [],
  next_memory_id: 1,
  next_task_id: 1,
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

function load(): StoreData {
  if (_data) return _data;
  const p = storePath();
  if (fs.existsSync(p)) {
    try {
      _data = JSON.parse(fs.readFileSync(p, "utf-8")) as StoreData;
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
