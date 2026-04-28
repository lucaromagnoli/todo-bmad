import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api as defaultApi } from '../api/client';
import type { Todo } from '../api/types';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export interface ApiSurface {
  listTodos: () => Promise<Todo[]>;
  createTodo: (text: string) => Promise<Todo>;
  updateTodo: (id: string, patch: Partial<Pick<Todo, 'text' | 'completed'>>) => Promise<Todo>;
  deleteTodo: (id: string) => Promise<void>;
}

export interface UseTodosResult {
  todos: Todo[];
  status: Status;
  error: string | null;
  create: (text: string) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  dismissError: () => void;
}

const tempId = () => `temp-${Math.random().toString(36).slice(2, 10)}`;

function messageFromError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'network_error') return 'Could not reach the server.';
    if (e.code === 'validation_error') return e.message || 'Invalid input.';
    if (e.code === 'not_found') return 'That todo no longer exists.';
    return 'Something went wrong on the server.';
  }
  return 'Unexpected error.';
}

export function useTodos(api: ApiSurface = defaultApi): UseTodosResult {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const todosRef = useRef<Todo[]>([]);
  useEffect(() => {
    todosRef.current = todos;
  }, [todos]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    api
      .listTodos()
      .then((list) => {
        if (cancelled) return;
        setTodos(list);
        setStatus('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        setError(messageFromError(e));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const create = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (text.length === 0) return;
      const optimistic: Todo = {
        id: tempId(),
        text,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTodos((prev) => [optimistic, ...prev]);
      setError(null);
      try {
        const real = await api.createTodo(text);
        setTodos((prev) => prev.map((t) => (t.id === optimistic.id ? real : t)));
      } catch (e) {
        setTodos((prev) => prev.filter((t) => t.id !== optimistic.id));
        setError(messageFromError(e));
      }
    },
    [api],
  );

  const toggle = useCallback(
    async (id: string) => {
      const prevSnapshot = todosRef.current;
      const target = prevSnapshot.find((t) => t.id === id);
      if (!target) return;
      const nextCompleted = !target.completed;
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: nextCompleted } : t)));
      setError(null);
      try {
        const real = await api.updateTodo(id, { completed: nextCompleted });
        setTodos((prev) => prev.map((t) => (t.id === id ? real : t)));
      } catch (e) {
        setTodos(prevSnapshot);
        setError(messageFromError(e));
      }
    },
    [api],
  );

  const remove = useCallback(
    async (id: string) => {
      const prevSnapshot = todosRef.current;
      if (!prevSnapshot.some((t) => t.id === id)) return;
      setTodos((prev) => prev.filter((t) => t.id !== id));
      setError(null);
      try {
        await api.deleteTodo(id);
      } catch (e) {
        setTodos(prevSnapshot);
        setError(messageFromError(e));
      }
    },
    [api],
  );

  const dismissError = useCallback(() => setError(null), []);

  return { todos, status, error, create, toggle, remove, dismissError };
}
