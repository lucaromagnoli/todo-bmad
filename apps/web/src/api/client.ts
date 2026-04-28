import type { ApiErrorCode, Todo } from './types';

const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    throw new ApiError('network_error', 'Could not reach the server', undefined);
  }

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const err =
      body && typeof body === 'object' && 'error' in body
        ? (body as { error: { code: ApiErrorCode; message: string } }).error
        : { code: 'internal_error' as const, message: `HTTP ${res.status}` };
    throw new ApiError(err.code, err.message, res.status);
  }

  return body as T;
}

export const api = {
  listTodos: () => request<Todo[]>('/api/todos'),
  createTodo: (text: string) =>
    request<Todo>('/api/todos', { method: 'POST', body: JSON.stringify({ text }) }),
  updateTodo: (id: string, patch: Partial<Pick<Todo, 'text' | 'completed'>>) =>
    request<Todo>(`/api/todos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteTodo: (id: string) =>
    request<void>(`/api/todos/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
