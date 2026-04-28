import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = Database.Database;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS todos (
    id          TEXT PRIMARY KEY,
    text        TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 500),
    completed   INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    owner_id    TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at DESC);
`;

export function openDb(path: string): Db {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
