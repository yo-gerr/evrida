'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/load-app');

const { esc } = loadApp();

test('esc escapes all five HTML special characters', () => {
  assert.equal(esc('& < > " \''), '&amp; &lt; &gt; &quot; &#39;');
});

test('esc escapes injected tags and attributes', () => {
  assert.equal(
    esc('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
  );
});

test('esc leaves normal text, emoji, and typographic characters intact', () => {
  assert.equal(esc('Read 10 pages \u{1F4DA}'), 'Read 10 pages \u{1F4DA}');
  assert.equal(esc('\u2019quoted\u2019 \u2014 \u00E9'), '\u2019quoted\u2019 \u2014 \u00E9');
});

test('esc coerces non-string values', () => {
  assert.equal(esc(42), '42');
  assert.equal(esc(undefined), 'undefined');
});
