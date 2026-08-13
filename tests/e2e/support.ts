import { expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

export const operatorToken = 'e2e-operator-token-with-enough-entropy';
export const prisma = new PrismaClient();

export async function resetDatabase() {
  await prisma.emailCampaign.deleteMany();
  await prisma.emailCampaignDraft.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.emailContact.deleteMany();
  await prisma.emailSender.deleteMany();
  await prisma.emailMailboxAccount.deleteMany();

  await prisma.emailContact.createMany({
    data: [
      { id: 'contact-1', email: 'editor@techdaily.example', displayName: 'Maya Chen', salutation: 'Hi Maya', language: 'en', company: 'Tech Daily', mediaName: 'Tech Daily', role: 'Editor', country: 'US', tags: ['media', 'ai'], status: 'active' },
      { id: 'contact-2', email: 'founder@remoteletter.example', displayName: 'Kenji Sato', salutation: 'Sato-san', language: 'ja', company: 'Remote Letter', mediaName: 'Remote Letter', role: 'Founder', country: 'JP', tags: ['remote', 'newsletter'], status: 'active' },
      { id: 'contact-3', email: 'partnerships@blocked.example', displayName: 'Blocked Contact', salutation: '', language: 'en', company: 'Blocked Media', mediaName: 'Blocked Media', role: 'Partnerships', country: 'US', tags: ['blocked'], status: 'blocked' },
      { id: 'contact-4', email: 'inactive@japan-media.example', displayName: 'Inactive Japan Media', salutation: 'Hello', language: 'ja', company: 'Japan Media', mediaName: 'Japan Media', role: 'Editor', country: 'JP', tags: ['japan-media'], status: 'inactive' },
    ],
  });

  await prisma.emailMailboxAccount.create({
    data: {
      id: 'mailbox-winnie-next2p', mailboxEmail: 'winnie@next2p.com', smtpHost: 'localhost.invalid',
      smtpPort: 465, smtpSecure: true, status: 'active', verificationStatus: 'verified', verifiedAt: new Date(),
    },
  });

  await prisma.emailSender.createMany({
    data: [
      { id: 'smtp-winnie-next2p', displayName: 'Winnie', email: 'winnie@next2p.com', domain: 'next2p.com', domainVerified: true, senderVerified: true, status: 'active', mailboxAccountId: 'mailbox-winnie-next2p' },
      { id: 'smtp-zeta-next2p', displayName: 'Zeta Operator', email: 'zeta@next2p.com', domain: 'next2p.com', domainVerified: true, senderVerified: true, status: 'active', mailboxAccountId: 'mailbox-winnie-next2p' },
      { id: 'smtp-disabled', displayName: 'Disabled Sender', email: 'disabled@example.test', domain: 'example.test', domainVerified: false, senderVerified: false, status: 'disabled' },
      { id: 'smtp-orphan-next2p', displayName: 'Orphan Sender', email: 'orphan@next2p.com', domain: 'next2p.com', domainVerified: true, senderVerified: true, status: 'active' },
    ],
  });
}

export async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Operator token').fill(operatorToken);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/$/, { timeout: 30_000 });
  await expect(page.getByText('4 contacts', { exact: true })).toBeVisible();
}

export async function openTab(page: Page, name: 'Contacts' | 'Campaign' | 'Compose') {
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
}
