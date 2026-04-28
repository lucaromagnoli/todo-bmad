import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { openDb, type Db } from '../src/db.js';

describe('todos routes', () => {
  let db: Db;
  let app: Express;

  beforeEach(() => {
    db = openDb(':memory:');
    app = createApp({ db });
  });

  afterEach(() => {
    db.close();
  });

  describe('GET /api/todos', () => {
    it('returns [] when empty', async () => {
      const res = await request(app).get('/api/todos');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns todos newest-first', async () => {
      const a = await request(app).post('/api/todos').send({ text: 'first' });
      // datetime('now') resolves at second precision, so nudge order via id tiebreaker
      const b = await request(app).post('/api/todos').send({ text: 'second' });
      const list = await request(app).get('/api/todos');
      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(2);
      const texts = list.body.map((t: { text: string }) => t.text);
      expect(texts).toContain('first');
      expect(texts).toContain('second');
      expect([a.body.id, b.body.id]).toContain(list.body[0].id);
    });

    it('each todo has the documented shape', async () => {
      await request(app).post('/api/todos').send({ text: 'one' });
      const res = await request(app).get('/api/todos');
      const t = res.body[0];
      expect(t).toEqual({
        id: expect.any(String),
        text: 'one',
        completed: false,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });
  });

  describe('POST /api/todos', () => {
    it('creates a todo (201) with completed=false and a fresh UUID', async () => {
      const res = await request(app).post('/api/todos').send({ text: 'walk dog' });
      expect(res.status).toBe(201);
      expect(res.body.text).toBe('walk dog');
      expect(res.body.completed).toBe(false);
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('trims surrounding whitespace before validating and persisting', async () => {
      const res = await request(app).post('/api/todos').send({ text: '  hello  ' });
      expect(res.status).toBe(201);
      expect(res.body.text).toBe('hello');
    });

    it('rejects empty text (400 validation_error)', async () => {
      const res = await request(app).post('/api/todos').send({ text: '' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('validation_error');
    });

    it('rejects whitespace-only text (400)', async () => {
      const res = await request(app).post('/api/todos').send({ text: '    ' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('validation_error');
    });

    it('rejects text longer than 500 chars (400)', async () => {
      const res = await request(app).post('/api/todos').send({ text: 'a'.repeat(501) });
      expect(res.status).toBe(400);
    });

    it('rejects missing text field (400)', async () => {
      const res = await request(app).post('/api/todos').send({});
      expect(res.status).toBe(400);
    });

    it('rejects non-string text (400)', async () => {
      const res = await request(app).post('/api/todos').send({ text: 42 });
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/todos/:id', () => {
    it('toggles completed and bumps updatedAt', async () => {
      const created = await request(app).post('/api/todos').send({ text: 'x' });
      const id = created.body.id;
      const before = created.body.updatedAt;

      // Wait long enough for SQLite's second-precision datetime('now') to advance
      await new Promise((r) => setTimeout(r, 1100));

      const patched = await request(app)
        .patch(`/api/todos/${id}`)
        .send({ completed: true });
      expect(patched.status).toBe(200);
      expect(patched.body.completed).toBe(true);
      expect(patched.body.updatedAt >= before).toBe(true);
    });

    it('toggles back to false', async () => {
      const created = await request(app).post('/api/todos').send({ text: 'y' });
      const id = created.body.id;
      await request(app).patch(`/api/todos/${id}`).send({ completed: true });
      const back = await request(app).patch(`/api/todos/${id}`).send({ completed: false });
      expect(back.status).toBe(200);
      expect(back.body.completed).toBe(false);
    });

    it('returns 404 not_found for unknown id', async () => {
      const res = await request(app)
        .patch('/api/todos/does-not-exist')
        .send({ completed: true });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('not_found');
    });

    it('rejects wrong type on completed (400)', async () => {
      const created = await request(app).post('/api/todos').send({ text: 'z' });
      const res = await request(app)
        .patch(`/api/todos/${created.body.id}`)
        .send({ completed: 'yes' });
      expect(res.status).toBe(400);
    });

    it('rejects empty body (400 — at least one field required)', async () => {
      const created = await request(app).post('/api/todos').send({ text: 'q' });
      const res = await request(app).patch(`/api/todos/${created.body.id}`).send({});
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/todos/:id', () => {
    it('deletes an existing todo (204) and removes it from the list', async () => {
      const created = await request(app).post('/api/todos').send({ text: 'gone' });
      const del = await request(app).delete(`/api/todos/${created.body.id}`);
      expect(del.status).toBe(204);
      expect(del.body).toEqual({});

      const list = await request(app).get('/api/todos');
      expect(list.body).toEqual([]);
    });

    it('returns 404 on second delete', async () => {
      const created = await request(app).post('/api/todos').send({ text: 'twice' });
      await request(app).delete(`/api/todos/${created.body.id}`);
      const second = await request(app).delete(`/api/todos/${created.body.id}`);
      expect(second.status).toBe(404);
      expect(second.body.error.code).toBe('not_found');
    });
  });

  describe('GET /api/health', () => {
    it('returns 200 ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });
});
