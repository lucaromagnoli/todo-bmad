import { test, expect } from '@playwright/test';
import { gotoApp, resetDb, seedTodo } from '../helpers';

test.beforeEach(async ({ request }) => {
  await resetDb(request);
});

// Story 4.4 — empty state on first load
test('shows the empty state when there are no todos', async ({ page }) => {
  await gotoApp(page);
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByTestId('todo-list')).toHaveCount(0);
});

// Story 4.1 — create and persist
test('creates a todo and the row survives a reload', async ({ page }) => {
  await gotoApp(page);

  const input = page.getByRole('textbox', { name: /new todo/i });
  await input.fill('first task');
  await input.press('Enter');

  const item = page.getByTestId('todo-item').filter({ hasText: 'first task' });
  await expect(item).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('empty-state')).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId('todo-item').filter({ hasText: 'first task' })).toBeVisible();
});

// Story 4.2 — toggle and persist
test('toggles a todo and the completed state persists across reload', async ({
  request,
  page,
}) => {
  await seedTodo(request, 'walk');
  await gotoApp(page);

  const item = page.getByTestId('todo-item').filter({ hasText: 'walk' });
  await expect(item).toBeVisible();
  await item.getByRole('checkbox').check();

  await expect(item).toHaveAttribute('data-completed', 'true');

  await page.reload();
  const reloaded = page.getByTestId('todo-item').filter({ hasText: 'walk' });
  await expect(reloaded).toHaveAttribute('data-completed', 'true');
});

// Story 4.3 — delete and persist
test('deletes a todo and the row stays gone after reload', async ({ request, page }) => {
  await seedTodo(request, 'gone');
  await gotoApp(page);

  const item = page.getByTestId('todo-item').filter({ hasText: 'gone' });
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: /delete "gone"/i }).click();
  await expect(item).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('gone')).toHaveCount(0);
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

// Story 4.5 — error banner appears when the API is unreachable
test('shows the error banner and rolls back the optimistic insert when the API is unreachable', async ({
  page,
}) => {
  await gotoApp(page);

  // Block POSTs to /api/todos at the network layer to simulate the API
  // being unreachable, without taking down the api container.
  await page.route('**/api/todos', async (route) => {
    if (route.request().method() === 'POST') {
      await route.abort('connectionrefused');
      return;
    }
    await route.continue();
  });

  const input = page.getByRole('textbox', { name: /new todo/i });
  await input.fill('will fail');
  await input.press('Enter');

  await expect(page.getByTestId('error-banner')).toBeVisible();
  await expect(page.getByText('will fail')).toHaveCount(0);
  await expect(page.getByTestId('empty-state')).toBeVisible();
});
