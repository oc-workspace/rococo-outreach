import assert from 'node:assert/strict';
import test from 'node:test';
import { createSimulatedMailTransport, isSimulatedMailTransportRequired } from '../lib/mail/simulatedTransport';

test('enables forced simulation only for the exact simulated mode', () => {
  const previous = process.env.OUTREACH_MAIL_TRANSPORT;
  try {
    delete process.env.OUTREACH_MAIL_TRANSPORT;
    assert.equal(isSimulatedMailTransportRequired(), false);
    process.env.OUTREACH_MAIL_TRANSPORT = 'smtp';
    assert.equal(isSimulatedMailTransportRequired(), false);
    process.env.OUTREACH_MAIL_TRANSPORT = 'simulated';
    assert.equal(isSimulatedMailTransportRequired(), true);
  } finally {
    if (previous === undefined) delete process.env.OUTREACH_MAIL_TRANSPORT;
    else process.env.OUTREACH_MAIL_TRANSPORT = previous;
  }
});

test('simulates recipient acceptance and controlled rejection without SMTP', async () => {
  const transport = createSimulatedMailTransport('failed@example.test');
  const message = {
    from: 'sender@example.test',
    replyTo: 'sender@example.test',
    subject: 'Test',
    html: '<p>Test</p>',
    text: 'Test',
  };

  const accepted = await transport.send({ ...message, to: 'accepted@example.test' });
  const rejected = await transport.send({ ...message, to: 'failed@example.test' });
  assert.deepEqual(accepted.accepted, ['accepted@example.test']);
  assert.deepEqual(accepted.rejected, []);
  assert.deepEqual(rejected.accepted, []);
  assert.deepEqual(rejected.rejected, ['failed@example.test']);
});
