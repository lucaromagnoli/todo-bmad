import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gotoApp, resetDb, seedTodo } from '../helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const reportDir = resolve(__dirname, '../../_bmad-output/implementation-artifacts/qa/a11y');

function saveReport(name: string, results: unknown) {
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(resolve(reportDir, `${name}.json`), JSON.stringify(results, null, 2));
}

test.beforeEach(async ({ request }) => {
  await resetDb(request);
});

test('a11y: empty state has no critical/serious WCAG AA violations', async ({ page }) => {
  await gotoApp(page);
  await expect(page.getByTestId('empty-state')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  saveReport('empty-state', results);
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(blocking).toEqual([]);
});

test('a11y: populated list has no critical/serious WCAG AA violations', async ({
  page,
  request,
}) => {
  await seedTodo(request, 'active task');
  const completed = await seedTodo(request, 'completed task');
  await request.patch(`/api/todos/${completed.id}`, { data: { completed: true } });
  await gotoApp(page);
  await expect(page.getByTestId('todo-list')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  saveReport('populated', results);
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(blocking).toEqual([]);
});

test('a11y: error banner state has no critical/serious WCAG AA violations', async ({ page }) => {
  await gotoApp(page);
  await page.route('**/api/todos', async (route) => {
    if (route.request().method() === 'POST') {
      await route.abort('connectionrefused');
      return;
    }
    await route.continue();
  });
  await page.getByRole('textbox', { name: /new todo/i }).fill('boom');
  await page.getByRole('textbox', { name: /new todo/i }).press('Enter');
  await expect(page.getByTestId('error-banner')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  saveReport('error-banner', results);
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  expect(blocking).toEqual([]);
});
