import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { pino } from 'pino';
import { Writable } from 'node:stream';
import { createApp } from '../src/app.js';
import { openDb, type Db } from '../src/db.js';

describe('request logging', () => {
  let db: Db;
  let lines: string[];
  let stream: Writable;

  beforeEach(() => {
    db = openDb(':memory:');
    lines = [];
    stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(chunk.toString());
        cb();
      },
    });
  });

  afterEach(() => {
    db.close();
  });

  it('emits one structured log line per request', async () => {
    const logger = pino({ level: 'info' }, stream);
    const app = createApp({ db, logger });

    await request(app).get('/api/health');
    await request(app).get('/api/todos');

    const reqLogs = lines
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter((entry): entry is Record<string, unknown> => entry !== null && 'req' in entry);

    expect(reqLogs.length).toBeGreaterThanOrEqual(2);
    const firstReq = reqLogs[0]!.req as { method: string; url: string };
    const firstRes = reqLogs[0]!.res as { statusCode: number };
    expect(firstReq.method).toBe('GET');
    expect(firstReq.url).toBe('/api/health');
    expect(firstRes.statusCode).toBe(200);
  });
});
