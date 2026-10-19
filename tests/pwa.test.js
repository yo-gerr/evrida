'use strict';
// PWA assets must stay in sync with the app: the manifest is valid, every
// icon it references exists, and index.html actually links and registers the
// service worker. This is static/asset verification only — it does not prove
// install or offline behavior in a real browser.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('manifest.webmanifest parses and declares an installable app', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.ok(m.name.includes('Evrida'));
  assert.equal(m.short_name, 'Evrida');
  assert.equal(m.display, 'standalone');
  assert.match(m.start_url, /^\.\/index\.html$/);
  assert.match(m.background_color, /^#[0-9A-F]{6}$/i);
  assert.match(m.theme_color, /^#[0-9A-F]{6}$/i);
});

test('every manifest icon exists on disk with sizes and type', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.ok(Array.isArray(m.icons) && m.icons.length >= 3);
  for (const icon of m.icons) {
    assert.ok(icon.src, 'icon src missing');
    assert.ok(icon.type, 'icon type missing');
    assert.ok(icon.sizes, 'icon sizes missing');
    const p = path.join(ROOT, icon.src);
    assert.ok(fs.existsSync(p), `missing icon file: ${icon.src}`);
    assert.ok(fs.statSync(p).size > 0, `empty icon file: ${icon.src}`);
  }
  // Android adaptive icons need a maskable variant with a full-bleed background.
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
});

test('service worker exists and covers the app shell', () => {
  const sw = read('sw.js');
  for (const listener of ['install', 'activate', 'fetch']) {
    assert.ok(
      sw.includes(`addEventListener('${listener}'`),
      `missing ${listener} listener`
    );
  }
  assert.ok(sw.includes('./index.html'), 'shell must precache index.html');
  assert.ok(
    sw.includes('./manifest.webmanifest'),
    'shell must precache the manifest'
  );
  assert.ok(!/fetch\(\s*['"]https?:/.test(sw), 'no cross-origin fetches');
});

test('index.html links the manifest, icons, and registers the worker', () => {
  const html = read('index.html');
  assert.ok(html.includes('rel="manifest" href="manifest.webmanifest"'));
  assert.ok(html.includes('rel="apple-touch-icon" href="icons/icon-180.png"'));
  assert.ok(html.includes('apple-mobile-web-app-capable'));
  assert.ok(html.includes("navigator.serviceWorker.register('sw.js')"));
  // Registration must be gated off file:// so direct-open use stays clean.
  assert.ok(html.includes("location.protocol === 'https:'"));
});

test('iOS home-screen icon is a valid 180x180 PNG', () => {
  const b = fs.readFileSync(path.join(ROOT, 'icons', 'icon-180.png'));
  assert.equal(b.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(b.readUInt32BE(16), 180);
  assert.equal(b.readUInt32BE(20), 180);
});
