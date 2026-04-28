import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Db } from '../db.js';
import { NotFoundError } from '../errors.js';
import {
  createTodoSchema,
  idParamSchema,
  rowToTodo,
  updateTodoSchema,
  type TodoRow,
} from '../schemas.js';

export function todosRouter(db: Db): Router {
  const router = Router();

  const listStmt = db.prepare<[], TodoRow>(
    `SELECT id, text, completed, created_at, updated_at, owner_id
       FROM todos ORDER BY created_at DESC, id DESC`,
  );
  const getStmt = db.prepare<[string], TodoRow>(
    `SELECT id, text, completed, created_at, updated_at, owner_id
       FROM todos WHERE id = ?`,
  );
  const insertStmt = db.prepare<[string, string]>(
    `INSERT INTO todos (id, text) VALUES (?, ?)`,
  );
  const deleteStmt = db.prepare<[string]>(`DELETE FROM todos WHERE id = ?`);

  router.get('/', (_req, res) => {
    const rows = listStmt.all();
    res.json(rows.map(rowToTodo));
  });

  router.post('/', (req, res) => {
    const { text } = createTodoSchema.parse(req.body);
    const id = uuidv4();
    insertStmt.run(id, text);
    const row = getStmt.get(id);
    if (!row) throw new Error('insert produced no row');
    res.status(201).json(rowToTodo(row));
  });

  router.patch('/:id', (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const patch = updateTodoSchema.parse(req.body);
    const existing = getStmt.get(id);
    if (!existing) throw new NotFoundError(`todo ${id} not found`);

    const sets: string[] = [];
    const params: (string | number)[] = [];
    if (patch.text !== undefined) {
      sets.push('text = ?');
      params.push(patch.text);
    }
    if (patch.completed !== undefined) {
      sets.push('completed = ?');
      params.push(patch.completed ? 1 : 0);
    }
    sets.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
    params.push(id);

    db.prepare(`UPDATE todos SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    const row = getStmt.get(id);
    if (!row) throw new NotFoundError(`todo ${id} not found`);
    res.json(rowToTodo(row));
  });

  router.delete('/:id', (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const result = deleteStmt.run(id);
    if (result.changes === 0) throw new NotFoundError(`todo ${id} not found`);
    res.status(204).end();
  });

  return router;
}
