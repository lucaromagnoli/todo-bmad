import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../src/api/client';

type FetchMock = ReturnType<typeof vi.fn>;

const ok = <T>(body: T, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const noContent = () => new Response(null, { status: 204 });

const fail = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('api client', () => {
  let fetchMock: FetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listTodos returns the parsed array', async () => {
    fetchMock.mockResolvedValueOnce(
      ok([
        {
          id: 'a',
          text: 'one',
          completed: false,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ]),
    );
    const list = await api.listTodos();
    expect(list).toHaveLength(1);
    expect(list[0]?.text).toBe('one');
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.method).toBeUndefined();
  });

  it('createTodo POSTs JSON body and returns the new todo', async () => {
    fetchMock.mockResolvedValueOnce(
      ok(
        {
          id: 'x',
          text: 'hi',
          completed: false,
          createdAt: 'now',
          updatedAt: 'now',
        },
        201,
      ),
    );
    const created = await api.createTodo('hi');
    expect(created.id).toBe('x');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/api\/todos$/);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ text: 'hi' }));
  });

  it('updateTodo PATCHes with the partial body', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        id: 'x',
        text: 'hi',
        completed: true,
        createdAt: 'now',
        updatedAt: 'now',
      }),
    );
    await api.updateTodo('x', { completed: true });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/api\/todos\/x$/);
    expect(init?.method).toBe('PATCH');
    expect(init?.body).toBe(JSON.stringify({ completed: true }));
  });

  it('deleteTodo issues DELETE and resolves on 204', async () => {
    fetchMock.mockResolvedValueOnce(noContent());
    await expect(api.deleteTodo('x')).resolves.toBeUndefined();
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.method).toBe('DELETE');
  });

  it('throws ApiError with the server-provided code and message on 4xx', async () => {
    fetchMock.mockResolvedValueOnce(fail(400, 'validation_error', 'bad text'));
    const err = await api.createTodo('').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('validation_error');
    expect(err.status).toBe(400);
    expect(err.message).toBe('bad text');
  });

  it('throws ApiError("network_error") on fetch rejection', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const err = await api.listTodos().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('network_error');
    expect(err.status).toBeUndefined();
  });

  it('falls back to a generic ApiError when server returns non-JSON 5xx', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }));
    const err = await api.listTodos().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('internal_error');
    expect(err.status).toBe(500);
  });
});
