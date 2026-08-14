import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDnsTxtRecord, hasMatchingTxtRecord } from '@/lib/outreach/domainVerification';

test('builds the scoped DNS TXT record', () => {
  assert.deepEqual(buildDnsTxtRecord('next2p.com', 'token-123'), {
    name: '_rococo-outreach.next2p.com',
    type: 'TXT',
    value: 'token-123',
  });
});

test('matches TXT records exactly after trimming', () => {
  assert.equal(hasMatchingTxtRecord([['other'], [' token-123 ']], 'token-123'), true);
  assert.equal(hasMatchingTxtRecord([['token-1234']], 'token-123'), false);
});
