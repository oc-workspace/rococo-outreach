import { expect, test } from '@playwright/test';
import { login, openTab, resetDatabase } from './support';

test.beforeEach(async ({ page }) => {
  await resetDatabase();
  await login(page);
});

test('autosaves the campaign draft and restores it after refresh', async ({ page }) => {
  await openTab(page, 'Compose');
  await page.getByLabel('Campaign name').fill('Persisted outreach draft');
  await page.getByLabel('Subject').fill('Saved subject for {{company}}');
  await expect(page.locator('.draftSaveStatus')).toContainText('Draft saved', { timeout: 10_000 });

  await page.reload();
  await openTab(page, 'Compose');
  await expect(page.getByLabel('Campaign name')).toHaveValue('Persisted outreach draft');
  await expect(page.getByLabel('Subject')).toHaveValue('Saved subject for {{company}}');
  await expect(page.locator('.draftSaveStatus')).toContainText('Draft saved', { timeout: 10_000 });
});

test('requires preview and second confirmation before simulated send', async ({ page }) => {
  await openTab(page, 'Compose');
  await expect(page.getByRole('button', { name: /Send 1 independent email/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Confirm real send' }).click();
  await expect(page.locator('.validationList')).toContainText('Run preview before sending.');

  await page.getByRole('button', { name: 'Preview' }).click();
  await page.getByRole('button', { name: 'Confirm real send' }).click();
  await page.getByRole('button', { name: 'Send 1 independent emails' }).click();

  await expect(page.getByRole('button', { name: /^Campaign/ })).toContainText('1');
  await expect(page.locator('.historyItem').first()).toContainText('sent');
  await expect(page.locator('.historyItem').first()).toContainText('attempts 1');
});

test('returns the same campaign for a repeated idempotency key', async ({ page }) => {
  const headers = { 'content-type': 'application/json', 'idempotency-key': 'e2e-idempotency-key-0001' };
  const payload = {
    name: 'Idempotent API campaign',
    subject: 'Idempotent subject',
    bodyHtml: '<p>Hello</p>',
    senderId: 'smtp-winnie-next2p',
    senderEmail: 'winnie@next2p.com',
    senderName: 'Winnie',
    replyToEmail: 'winnie@next2p.com',
    deliveries: [{ contactId: 'contact-1', to: 'editor@techdaily.example', subject: 'Rendered subject', bodyHtml: '<p>Hello Maya</p>', bodyText: 'untrusted client text', salutation: 'Hi Maya', warnings: [] }],
  };

  const first = await page.request.post('/api/campaigns/send', { headers, data: payload });
  const second = await page.request.post('/api/campaigns/send', { headers, data: payload });
  expect(first.status()).toBe(200);
  expect(second.status()).toBe(200);
  const firstCampaign = (await first.json()).data;
  const secondCampaign = (await second.json()).data;
  expect(secondCampaign.id).toBe(firstCampaign.id);
  expect(secondCampaign.deliveries[0].bodyText).toBe('Hello Maya');

  const history = await page.request.get('/api/campaigns');
  expect(((await history.json()).data as unknown[])).toHaveLength(1);
});

test('persists a partial failure and retries only the failed recipient', async ({ page }) => {
  await openTab(page, 'Compose');
  await page.getByRole('button', { name: '+' }).click();
  const recipientRows = page.locator('.recipientRow');
  await recipientRows.nth(1).getByLabel('Contact').selectOption('contact-2');

  await page.route('**/api/campaigns/send', async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        'x-outreach-simulate-failure-recipient': 'founder@remoteletter.example',
      },
    });
  });

  await page.getByRole('button', { name: 'Preview' }).click();
  await page.getByRole('button', { name: 'Confirm real send' }).click();
  await page.getByRole('button', { name: 'Send 2 independent emails' }).click();

  const campaign = page.locator('.historyItem').first();
  await expect(campaign).toContainText('partial_failed');
  await expect(campaign).toContainText('sent 1');
  await expect(campaign).toContainText('failed 1');
  await campaign.getByRole('button', { name: 'Retry failed recipients' }).click();
  await expect(campaign).toContainText('sent');
  await expect(campaign).toContainText('failed 0');
  await expect(campaign).toContainText('founder@remoteletter.example');
  await expect(campaign).toContainText('attempts 2');
});
