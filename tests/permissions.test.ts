import test from 'node:test';
import assert from 'node:assert/strict';
import { hasOutreachPermission } from '@/lib/outreach/permissions';

test('owner and admin can manage senders and verify domains', () => {
  for (const role of ['owner', 'admin']) {
    assert.equal(hasOutreachPermission(role, 'sender:read'), true);
    assert.equal(hasOutreachPermission(role, 'sender:write'), true);
    assert.equal(hasOutreachPermission(role, 'domain:verify'), true);
  }
});

test('editor and viewer are read-only for sender records', () => {
  assert.equal(hasOutreachPermission('editor', 'sender:read'), true);
  assert.equal(hasOutreachPermission('editor', 'sender:write'), false);
  assert.equal(hasOutreachPermission('viewer', 'domain:verify'), false);
  assert.equal(hasOutreachPermission('unknown', 'sender:read'), false);
});
