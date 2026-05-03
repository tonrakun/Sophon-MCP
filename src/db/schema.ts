export const SCHEMA = `
CREATE TABLE IF NOT EXISTS memories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  key       TEXT    NOT NULL UNIQUE,
  value     TEXT    NOT NULL,
  tags      TEXT    NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  status      TEXT    NOT NULL DEFAULT 'pending',
  priority    INTEGER NOT NULL DEFAULT 0,
  due_date    TEXT,
  tags        TEXT    NOT NULL DEFAULT '[]',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
`;

export type MemoryRow = {
  id: number;
  key: string;
  value: string;
  tags: string;
  created_at: number;
  updated_at: number;
};

export type TaskRow = {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: number;
  due_date: string | null;
  tags: string;
  created_at: number;
  updated_at: number;
};

export type TaskStatus = "pending" | "in_progress" | "done" | "cancelled";
