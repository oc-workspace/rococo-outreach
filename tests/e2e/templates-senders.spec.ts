import { expect, test } from '@playwright/test';
import { login, openTab, resetDatabase } from './support';

test.beforeEach(async ({ page }) => {
  await resetDatabase();
  await login(page);
  await openTab(page, 'Compose');
});

test('selects senders and recovers to a valid default after reload', async ({ page }) => {
  const sender = page.getByLabel('Sender shown to recipients');
  const replyTo = page.getByLabel('Reply-to email');
  await expect(sender).toHaveValue('smtp-winnie-next2p');
  await expect(replyTo).toHaveValue('winnie@next2p.com');

  await sender.selectOption('smtp-zeta-next2p');
  await expect(replyTo).toHaveValue('zeta@next2p.com');

  await page.reload();
  await openTab(page, 'Compose');
  await expect(sender).toHaveValue('smtp-winnie-next2p');
  await expect(page.getByText('Verified', { exact: true })).toBeVisible();
});

test('persists and reapplies a reusable template after refresh', async ({ page }) => {
  await page.getByLabel('Subject').fill('Persistent template subject');
  await page.getByLabel('Email body editor').fill('Persistent template body');
  await page.getByLabel('Template name').fill('E2E reusable template');
  await page.getByLabel('Description (optional)').fill('Created by isolated browser test');
  await page.getByRole('button', { name: 'Save current as template' }).click();
  await expect(page.getByText('Template saved.')).toBeVisible();

  await page.reload();
  await openTab(page, 'Compose');
  const template = page.locator('.templateItem').filter({ hasText: 'E2E reusable template' });
  await expect(template).toBeVisible();
  await page.getByLabel('Subject').fill('Temporary subject');
  await template.getByRole('button', { name: 'Use' }).click();
  await expect(page.getByLabel('Subject')).toHaveValue('Persistent template subject');
  await expect(page.getByLabel('Email body editor')).toContainText('Persistent template body');
});
