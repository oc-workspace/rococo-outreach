import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeEmailHtml } from '../lib/outreach/htmlSafety';

test('keeps supported email formatting', () => {
  const input = '<h2>Intro</h2><p>Hello <strong>team</strong>.</p><ul><li>One</li></ul>';
  assert.equal(sanitizeEmailHtml(input), input);
});

test('removes executable tags, event handlers, styles, and unsafe URLs', () => {
  const result = sanitizeEmailHtml([
    '<script>alert(1)</script>',
    '<style>body{display:none}</style>',
    '<p onclick="alert(1)" style="color:red">Safe text</p>',
    '<a href="javascript:alert(1)" onmouseover="alert(2)">bad</a>',
    '<iframe src="https://example.com"></iframe>',
  ].join(''));

  assert.equal(result, '<p>Safe text</p><a>bad</a>');
  assert.doesNotMatch(result, /script|style|onclick|onmouseover|javascript:|iframe/i);
});

test('keeps safe links and hardens new-window links', () => {
  assert.equal(
    sanitizeEmailHtml('<a href="https://example.com" target="_blank">Visit</a>'),
    '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Visit</a>',
  );
});
