import cors from 'cors';
import express, { type Express } from 'express';
import type { Db } from './db.js';
import { errorMiddleware } from './errors.js';
import { todosRouter } from './routes/todos.js';

export interface AppOptions {
  db: Db;
  corsOrigin?: string | string[];
}

export function createApp({ db, corsOrigin }: AppOptions): Express {
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.use(cors({ origin: corsOrigin ?? false }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/todos', todosRouter(db));

  app.use(errorMiddleware());
  return app;
}
