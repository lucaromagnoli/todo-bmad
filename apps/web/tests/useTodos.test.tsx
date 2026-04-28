import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError } from '../src/api/client';
import type { Todo } from '../src/api/types';
import { useTodos, type ApiSurface } from '../src/hooks/useTodos';

function makeTodo(partial: Partial<Todo> = {}): Todo {
  return {
    id: partial.id ?? 'a',
    text: partial.text ?? 'one',
    completed: partial.completed ?? false,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    ...partial,
  };
}

function makeApi(overrides: Partial<ApiSurface> = {}): ApiSurface {
  return {
    listTodos: vi.fn(async () => []),
    createTodo: vi.fn(async (text: string) => makeTodo({ id: 'real-id', text })),
    updateTodo: vi.fn(async (id: string, patch) => makeTodo({ id, ...patch })),
    deleteTodo: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('useTodos', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in loading and transitions to ready with the fetched list', async () => {
    const api = makeApi({ listTodos: vi.fn(async () => [makeTodo()]) });
    const { result } = renderHook(() => useTodos(api));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.todos).toHaveLength(1);
  });

  it('transitions to error if listTodos rejects', async () => {
    const api = makeApi({
      listTodos: vi.fn(async () => {
        throw new ApiError('network_error', 'down');
      }),
    });
    const { result } = renderHook(() => useTodos(api));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toMatch(/server/i);
  });

  describe('create', () => {
    it('inserts the new todo at the top optimistically and reconciles with the server result', async () => {
      const real = makeTodo({ id: 'server-id', text: 'walk dog' });
      const api = makeApi({ createTodo: vi.fn(async () => real) });
      const { result } = renderHook(() => useTodos(api));
      await waitFor(() => expect(result.current.status).toBe('ready'));

      await act(async () => {
        await result.current.create('walk dog');
      });
      expect(result.current.todos[0]?.id).toBe('server-id');
      expect(result.current.todos[0]?.text).toBe('walk dog');
    });

    it('rolls back the optimistic insert and surfaces an error message on failure', async () => {
      const api = makeApi({
        createTodo: vi.fn(async () => {
          throw new ApiError('validation_error', 'too long');
        }),
      });
      const { result } = renderHook(() => useTodos(api));
      await waitFor(() => expect(result.current.status).toBe('ready'));

      await act(async () => {
        await result.current.create('walk');
      });
      expect(result.current.todos).toHaveLength(0);
      expect(result.current.error).toBe('too long');
    });

    it('ignores empty/whitespace-only input', async () => {
      const api = makeApi();
      const { result } = renderHook(() => useTodos(api));
      await waitFor(() => expect(result.current.status).toBe('ready'));
      await act(async () => {
        await result.current.create('   ');
      });
      expect(api.createTodo).not.toHaveBeenCalled();
      expect(result.current.todos).toHaveLength(0);
    });
  });

  describe('toggle', () => {
    it('flips completed optimistically and confirms with the server', async () => {
      const initial = makeTodo({ id: 'a', completed: false });
      const api = makeApi({
        listTodos: vi.fn(async () => [initial]),
        updateTodo: vi.fn(async (id, patch) => makeTodo({ id, ...patch })),
      });
      const { result } = renderHook(() => useTodos(api));
      await waitFor(() => expect(result.current.status).toBe('ready'));

      await act(async () => {
        await result.current.toggle('a');
      });
      expect(result.current.todos[0]?.completed).toBe(true);
      expect(api.updateTodo).toHaveBeenCalledWith('a', { completed: true });
    });

    it('reverts the optimistic flip on failure and shows an error', async () => {
      const initial = makeTodo({ id: 'a', completed: false });
      const api = makeApi({
        listTodos: vi.fn(async () => [initial]),
        updateTodo: vi.fn(async () => {
          throw new ApiError('internal_error', 'boom');
        }),
      });
      const { result } = renderHook(() => useTodos(api));
      await waitFor(() => expect(result.current.status).toBe('ready'));

      await act(async () => {
        await result.current.toggle('a');
      });
      expect(result.current.todos[0]?.completed).toBe(false);
      expect(result.current.error).toMatch(/server/i);
    });
  });

  describe('remove', () => {
    it('removes the row optimistically', async () => {
      const a = makeTodo({ id: 'a' });
      const b = makeTodo({ id: 'b' });
      const api = makeApi({ listTodos: vi.fn(async () => [a, b]) });
      const { result } = renderHook(() => useTodos(api));
      await waitFor(() => expect(result.current.todos).toHaveLength(2));

      await act(async () => {
        await result.current.remove('a');
      });
      expect(result.current.todos.map((t) => t.id)).toEqual(['b']);
    });

    it('restores the row and shows an error when delete fails', async () => {
      const a = makeTodo({ id: 'a' });
      const api = makeApi({
        listTodos: vi.fn(async () => [a]),
        deleteTodo: vi.fn(async () => {
          throw new ApiError('not_found', 'gone');
        }),
      });
      const { result } = renderHook(() => useTodos(api));
      await waitFor(() => expect(result.current.todos).toHaveLength(1));

      await act(async () => {
        await result.current.remove('a');
      });
      expect(result.current.todos).toHaveLength(1);
      expect(result.current.error).toMatch(/no longer exists/i);
    });
  });

  describe('dismissError', () => {
    it('clears the error message', async () => {
      const api = makeApi({
        listTodos: vi.fn(async () => {
          throw new ApiError('network_error', 'down');
        }),
      });
      const { result } = renderHook(() => useTodos(api));
      await waitFor(() => expect(result.current.error).not.toBeNull());
      act(() => {
        result.current.dismissError();
      });
      expect(result.current.error).toBeNull();
    });
  });
});
