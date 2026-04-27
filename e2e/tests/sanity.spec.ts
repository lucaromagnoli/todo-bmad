import { test, expect } from '@playwright/test';

test('e2e: sanity — playwright runs', async () => {
  expect(1 + 1).toBe(2);
});
