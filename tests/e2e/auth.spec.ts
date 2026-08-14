import { expect, test } from '@playwright/test';
import { operatorToken, resetDatabase } from './support';

test.beforeEach(async () => {
  await resetDatabase();
});

test('requires login for pages and APIs', async ({ page }) => {
  const apiResponse = await page.request.get('/api/contacts');
  expect(apiResponse.status()).toBe(401);
  expect((await page.request.get('/api/senders')).status()).toBe(401);

  await page.goto('/');
  await expect(page).toHaveURL(/\/login\?returnTo=/);

  await page.getByLabel('Operator token').fill('wrong-token');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('.errorText')).toHaveText('Invalid operator token.');

  await page.getByLabel('Operator token').fill(operatorToken);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/$/, { timeout: 30_000 });
  await expect(page.getByText('4 contacts', { exact: true })).toBeVisible();
});
