import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { errorMiddleware, mapError, NotFoundError } from '../src/errors.js';

describe('mapError', () => {
  it('maps ZodError → 400 validation_error with field details', () => {
    const schema = z.object({ text: z.string().min(1) });
    let caught: unknown;
    try {
      schema.parse({ text: '' });
    } catch (e) {
      caught = e;
    }
    const mapped = mapError(caught);
    expect(mapped.status).toBe(400);
    expect(mapped.body.error.code).toBe('validation_error');
    expect(mapped.body.error.details).toBeDefined();
  });

  it('maps NotFoundError → 404 not_found preserving message', () => {
    const mapped = mapError(new NotFoundError('todo missing'));
    expect(mapped.status).toBe(404);
    expect(mapped.body.error).toEqual({ code: 'not_found', message: 'todo missing' });
  });

  it('maps unknown errors → 500 internal_error with generic message', () => {
    const mapped = mapError(new Error('boom'));
    expect(mapped.status).toBe(500);
    expect(mapped.body.error.code).toBe('internal_error');
    expect(mapped.body.error.message).toBe('Internal server error');
  });

  it('handles non-Error throwables (e.g. strings)', () => {
    const mapped = mapError('something weird');
    expect(mapped.status).toBe(500);
    expect(mapped.body.error.code).toBe('internal_error');
  });
});

describe('errorMiddleware', () => {
  function makeRes() {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    return { status, json } as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  }

  it('writes the mapped envelope to the response', () => {
    const res = makeRes();
    const mw = errorMiddleware();
    mw(new NotFoundError('gone'), {} as never, res as never, vi.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.status.mock.results[0]?.value.json).toHaveBeenCalledWith({
      error: { code: 'not_found', message: 'gone' },
    });
  });

  it('logs only on 500-class errors', () => {
    const logger = { error: vi.fn() };
    const mw = errorMiddleware(logger);
    const res1 = makeRes();
    mw(new NotFoundError('x'), {} as never, res1 as never, vi.fn());
    expect(logger.error).not.toHaveBeenCalled();

    const res2 = makeRes();
    mw(new Error('boom'), {} as never, res2 as never, vi.fn());
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
