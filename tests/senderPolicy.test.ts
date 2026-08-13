import test from 'node:test';
import assert from 'node:assert/strict';
import { getEmailDomain, isAllowedSenderEmail, readAllowedSenderDomains } from '@/lib/outreach/senderPolicy';

test('uses next2p.com as the safe default sender domain', () => {
  assert.deepEqual(readAllowedSenderDomains(''), ['next2p.com']);
  assert.equal(isAllowedSenderEmail('winnie@next2p.com', ['next2p.com']), true);
  assert.equal(isAllowedSenderEmail('winnie@evilnext2p.com', ['next2p.com']), false);
  assert.equal(isAllowedSenderEmail('winnie@other.example', ['next2p.com']), false);
  assert.equal(isAllowedSenderEmail('a@@next2p.com', ['next2p.com']), false);
});

test('normalizes configured domains without widening the exact-domain match', () => {
  assert.deepEqual(readAllowedSenderDomains(' NEXT2P.COM,example.org, next2p.com '), ['next2p.com', 'example.org']);
  assert.equal(getEmailDomain(' Winnie@NEXT2P.COM '), 'next2p.com');
  assert.equal(isAllowedSenderEmail('winnie@example.org', ['next2p.com', 'example.org']), true);
  assert.equal(isAllowedSenderEmail('invalid-address', ['next2p.com']), false);
});
