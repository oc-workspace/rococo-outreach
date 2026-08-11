import { expect, test } from '@playwright/test';
import { login, openTab, resetDatabase } from './support';

test.beforeEach(async ({ page }) => {
  await resetDatabase();
  await login(page);
});

test('previews, imports, repeats, and rejects invalid CSV rows', async ({ page }) => {
  await page.getByRole('button', { name: 'Import CSV' }).click();
  const fileInput = page.getByLabel('CSV file');

  await fileInput.setInputFiles({
    name: 'invalid.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('email,displayName,status\nvalid@example.test,Valid,active\nnot-an-email,Bad,active\ndupe@example.test,One,active\ndupe@example.test,Two,active'),
  });
  await expect(page.getByText('rows 4')).toBeVisible();
  await expect(page.getByText('valid 2')).toBeVisible();
  await expect(page.getByText('issues 2')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import valid rows' })).toBeDisabled();

  const validCsv = 'email,displayName,salutation,language,company,tags,status\nnew-one@example.test,New One,Hello,en,Example,media;new,active\nnew-two@example.test,New Two,Konnichiwa,ja,Example,japan-media,inactive';
  await fileInput.setInputFiles({ name: 'valid.csv', mimeType: 'text/csv', buffer: Buffer.from(validCsv) });
  await expect(page.getByText('valid 2')).toBeVisible();
  await expect(page.getByText('issues 0')).toBeVisible();
  await page.getByRole('button', { name: 'Import valid rows' }).click();
  await expect(page.getByText('6 contacts', { exact: true })).toBeVisible();

  await fileInput.setInputFiles({ name: 'valid.csv', mimeType: 'text/csv', buffer: Buffer.from(validCsv) });
  await page.getByRole('button', { name: 'Import valid rows' }).click();
  await expect(page.getByText('6 contacts', { exact: true })).toBeVisible();
});

test('filters contacts, selects visible rows, and protects blocked contacts', async ({ page }) => {
  await page.getByLabel('Status').selectOption('blocked');
  await expect(page.getByText('partnerships@blocked.example', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Select partnerships@blocked.example')).toBeDisabled();
  await expect(page.getByText('founder@remoteletter.example', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Select visible' })).toBeDisabled();

  await page.getByLabel('Status').selectOption('active');
  await page.getByLabel('Tag').selectOption('newsletter');
  await page.getByRole('checkbox', { name: 'Select visible' }).check();
  await expect(page.getByText('selected 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add selected to Campaign' }).click();
  await expect(page.getByRole('button', { name: /^Compose/ })).toContainText('2 recipients');

  await openTab(page, 'Contacts');
  await page.getByLabel('Status').selectOption('inactive');
  await page.getByLabel('Tag').selectOption('japan-media');
  await expect(page.getByText('inactive@japan-media.example', { exact: true })).toBeVisible();
});
