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

test('edits, versions, archives, and restores a template', async ({ page }) => {
  await page.getByLabel('Template name').fill('Versioned template');
  await page.getByLabel('Purpose').fill('media outreach');
  await page.getByLabel('Tags').fill('media, japan');
  await page.getByRole('button', { name: 'Save current as template' }).click();
  await expect(page.getByText('Versioned template · v1', { exact: true })).toBeVisible();

  const item = page.locator('.templateItem').filter({ hasText: 'Versioned template · v1' });
  await item.getByRole('button', { name: 'Edit' }).click();
  await item.getByLabel('Edit template purpose').fill('updated outreach');
  await item.getByRole('button', { name: 'Save edit' }).click();
  await expect(item).toContainText('updated outreach');

  await item.getByRole('button', { name: 'New version' }).click();
  await expect(page.locator('.templateItem').filter({ hasText: 'Versioned template · v2' })).toBeVisible();

  const versioned = page.locator('.templateItem').filter({ hasText: 'Versioned template · v2' });
  await versioned.getByRole('button', { name: 'Versions' }).click();
  await expect(versioned).toContainText('v1');
  await versioned.getByRole('button', { name: 'Switch' }).click();
  await expect(page.locator('.templateItem').filter({ hasText: 'Versioned template · v1' })).toBeVisible();

  const switched = page.locator('.templateItem').filter({ hasText: 'Versioned template · v1' });
  await switched.getByRole('button', { name: 'Archive' }).click();
  await expect(switched).toContainText('archived');
  await expect(switched.getByRole('button', { name: 'Use' })).toBeDisabled();
  await switched.getByRole('button', { name: 'Restore' }).click();
  await expect(switched).toContainText('active');
});
