import { createApp } from './app.js';
import { openDb } from './db.js';
import { createLogger } from './logger.js';

const logger = createLogger();
const port = Number(process.env.PORT ?? 3001);
const databasePath = process.env.DATABASE_PATH ?? './data/app.db';
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

const db = openDb(databasePath);
const app = createApp({ db, corsOrigin, logger });

const server = app.listen(port, () => {
  logger.info({ port, databasePath, corsOrigin }, 'todo-bmad api listening');
});

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down');
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
