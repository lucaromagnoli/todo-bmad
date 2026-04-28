import type { APIRequestContext, Page } from '@playwright/test';

export interface ApiTodo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function resetDb(request: APIRequestContext): Promise<void> {
  const res = await request.get('/api/todos');
  if (!res.ok()) throw new Error(`reset: list returned ${res.status()}`);
  const todos = (await res.json()) as ApiTodo[];
  await Promise.all(
    todos.map((t) =>
      request.delete(`/api/todos/${encodeURIComponent(t.id)}`).then((r) => {
        if (!r.ok() && r.status() !== 404) {
          throw new Error(`reset: delete ${t.id} returned ${r.status()}`);
        }
      }),
    ),
  );
}

export async function seedTodo(request: APIRequestContext, text: string): Promise<ApiTodo> {
  const res = await request.post('/api/todos', { data: { text } });
  if (!res.ok()) throw new Error(`seed: post returned ${res.status()}`);
  return (await res.json()) as ApiTodo;
}

export async function gotoApp(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('h1', { state: 'visible' });
}
