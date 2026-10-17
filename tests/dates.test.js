'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, setToday } = require('./helpers/load-app');

const { localKey, today, dateFrom, shift, daysBetween, pct } = loadApp();

test('localKey formats dates as zero-padded YYYY-MM-DD', () => {
  assert.equal(localKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(localKey(new Date(2026, 11, 31)), '2026-12-31');
});

test('today reflects the current (mockable) clock', (t) => {
  setToday(t, 2026, 3, 17);
  assert.equal(today(), '2026-03-17');
});

test('dateFrom parses date-only keys at local noon to avoid timezone day shifts', () => {
  const d = dateFrom('2026-01-15');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 0);
  assert.equal(d.getDate(), 15);
  assert.equal(d.getHours(), 12);
});

test('shift crosses month and year boundaries', () => {
  assert.equal(shift('2026-12-31', 1), '2027-01-01');
  assert.equal(shift('2026-01-01', -1), '2025-12-31');
  assert.equal(shift('2026-02-28', 1), '2026-03-01');
  assert.equal(shift('2026-03-01', -1), '2026-02-28');
});

test('shift handles leap and non-leap February boundaries', () => {
  assert.equal(shift('2028-02-28', 1), '2028-02-29'); // 2028 is a leap year
  assert.equal(shift('2028-02-29', 1), '2028-03-01');
  assert.equal(shift('2027-02-28', 1), '2027-03-01'); // 2027 is not
});

test('shift over long spans lands on the same calendar day', () => {
  assert.equal(shift('2026-01-15', 365), '2027-01-15');
  assert.equal(shift('2026-01-15', -45), '2025-12-01');
});

test('daysBetween counts calendar days, signed', () => {
  assert.equal(daysBetween('2026-01-01', '2026-01-31'), 30);
  assert.equal(daysBetween('2026-01-15', '2026-01-15'), 0);
  assert.equal(daysBetween('2026-02-01', '2026-01-01'), -31);
  assert.equal(daysBetween('2025-12-31', '2026-01-01'), 1); // across year boundary
});

test('pct rounds to whole percentages and guards division by zero', () => {
  assert.equal(pct(1, 3), 33);
  assert.equal(pct(2, 3), 67);
  assert.equal(pct(0, 10), 0);
  assert.equal(pct(5, 0), 0);
  assert.equal(pct(10, 10), 100);
});
