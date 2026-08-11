import assert from 'node:assert/strict';
import test from 'node:test';
import { createOutreachSession, isOutreachSessionValid, outreachSessionTtlSeconds, tokensMatch } from '../lib/outreach/sessionAuth';

const secret = 'test-operator-token-with-enough-entropy';
const now = Date.UTC(2026, 7, 11, 12, 0, 0);

test('creates a valid bounded session', () => {
  const session = createOutreachSession(secret, now);
  assert.equal(isOutreachSessionValid(session, secret, now), true);
  assert.equal(isOutreachSessionValid(session, secret, now + outreachSessionTtlSeconds * 1000), false);
});

test('rejects tampered sessions and the wrong secret', () => {
  const session = createOutreachSession(secret, now);
  assert.equal(isOutreachSessionValid(`${session}0`, secret, now), false);
  assert.equal(isOutreachSessionValid(session, 'different-secret', now), false);
});

test('compares bearer tokens exactly', () => {
  assert.equal(tokensMatch(secret, secret), true);
  assert.equal(tokensMatch(secret, `${secret}x`), false);
});
