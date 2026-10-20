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

test('esc neutralizes when/where markup before it reaches a card', () => {
  const { normalize, cueSentence } = require('./helpers/load-app').loadApp();
  const h = normalize({
    habits: [{ name: 'Read', when: '<script>alert(1)</script>', where: 'at "my" desk' }],
  }).habits[0];
  assert.equal(
    esc(cueSentence(h)),
    'I will Read &lt;script&gt;alert(1)&lt;/script&gt; at &quot;my&quot; desk',
  );
});
