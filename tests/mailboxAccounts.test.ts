import test from 'node:test';
import assert from 'node:assert/strict';
import { isMailboxAccountReady, mailboxAccountMatchesSmtp } from '@/lib/outreach/mailboxAccounts';

const account = {
  mailboxEmail: 'winnie@next2p.com',
  smtpHost: 'smtp.exmail.qq.com',
  smtpPort: 465,
  smtpSecure: true,
  status: 'active',
  verificationStatus: 'verified',
};

test('requires an active and verified mailbox account', () => {
  assert.equal(isMailboxAccountReady(account), true);
  assert.equal(isMailboxAccountReady({ ...account, status: 'disabled' }), false);
  assert.equal(isMailboxAccountReady({ ...account, verificationStatus: 'unverified' }), false);
  assert.equal(isMailboxAccountReady(null), false);
});

test('matches the persistent mailbox account to the connected SMTP configuration', () => {
  const config = { user: account.mailboxEmail, host: account.smtpHost, port: account.smtpPort, secure: account.smtpSecure };
  assert.equal(mailboxAccountMatchesSmtp(account, config), true);
  assert.equal(mailboxAccountMatchesSmtp(account, { ...config, user: 'other@next2p.com' }), false);
  assert.equal(mailboxAccountMatchesSmtp(account, { ...config, host: 'smtp.other.example' }), false);
  assert.equal(mailboxAccountMatchesSmtp(account, { ...config, port: 587 }), false);
});
