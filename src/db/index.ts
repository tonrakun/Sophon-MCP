import Database from "better-sqlite3";
import path from "node:path";
import { SCHEMA } from "./schema.js";

let _db: Database.Database | null = null;

export function getDb(dbPath?: string): Database.Database {
  if (_db) return _db;
  const resolved = dbPath ?? path.join(process.cwd(), "sophon.db");
  _db = new Database(resolved);
  _db.pragma("journal_mode = WAL");
  _db.exec(SCHEMA);
  return _db;
}
