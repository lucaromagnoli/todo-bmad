import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb, type Db } from '../src/db.js';

describe('db', () => {
  let tmpDir: string;
  let dbPath: string;
  let db: Db;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'todo-bmad-db-'));
    dbPath = join(tmpDir, 'test.db');
    db = openDb(dbPath);
  });

  afterEach(() => {
    db.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates the todos table with the expected columns', () => {
    const cols = db
      .prepare(`PRAGMA table_info(todos)`)
      .all() as Array<{ name: string; notnull: number; dflt_value: string | null }>;
    const byName = Object.fromEntries(cols.map((c) => [c.name, c]));
    expect(Object.keys(byName).sort()).toEqual(
      ['completed', 'created_at', 'id', 'owner_id', 'text', 'updated_at'].sort(),
    );
    expect(byName.owner_id?.notnull).toBe(0); // owner_id is nullable for future auth
    expect(byName.text?.notnull).toBe(1);
  });

  it('creates the created_at index', () => {
    const indexes = db
      .prepare(`PRAGMA index_list('todos')`)
      .all() as Array<{ name: string }>;
    expect(indexes.map((i) => i.name)).toContain('idx_todos_created_at');
  });

  it('persists rows across a reopen of the same file', () => {
    db.prepare(`INSERT INTO todos (id, text) VALUES (?, ?)`).run('a', 'first');
    db.prepare(`INSERT INTO todos (id, text) VALUES (?, ?)`).run('b', 'second');
    db.close();

    const reopened = openDb(dbPath);
    try {
      const rows = reopened.prepare(`SELECT id, text, owner_id FROM todos ORDER BY id`).all();
      expect(rows).toEqual([
        { id: 'a', text: 'first', owner_id: null },
        { id: 'b', text: 'second', owner_id: null },
      ]);
    } finally {
      reopened.close();
      db = openDb(dbPath); // reset for afterEach close()
    }
  });

  it('rejects text outside 1..500 chars (CHECK constraint)', () => {
    expect(() =>
      db.prepare(`INSERT INTO todos (id, text) VALUES (?, ?)`).run('x', ''),
    ).toThrow(/CHECK/i);
    expect(() =>
      db.prepare(`INSERT INTO todos (id, text) VALUES (?, ?)`).run('y', 'a'.repeat(501)),
    ).toThrow(/CHECK/i);
  });

  it('rejects completed values other than 0 or 1', () => {
    expect(() =>
      db
        .prepare(`INSERT INTO todos (id, text, completed) VALUES (?, ?, ?)`)
        .run('z', 'hi', 2),
    ).toThrow(/CHECK/i);
  });
});
