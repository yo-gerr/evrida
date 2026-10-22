'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, setToday } = require('./helpers/load-app');

const { normalize, defaultState, VERSION, EMOJIS, COLORS, QUOTES, setState, cueSentence } = loadApp();

function baseHabit(overrides = {}) {
  return { name: 'Test habit', ...overrides };
}

// --- Root-level validation -------------------------------------------------

test('normalize rejects roots without a habits list', () => {
  assert.throws(() => normalize(null), /habits list/);
  assert.throws(() => normalize({}), /habits list/);
  assert.throws(() => normalize({ habits: {} }), /habits list/);
  assert.throws(() => normalize({ habits: 'x' }), /habits list/);
});

test('normalize rejects more than 500 habits but accepts exactly 500', () => {
  const many = Array.from({ length: 501 }, (_, i) => baseHabit({ name: `H${i}` }));
  assert.throws(() => normalize({ habits: many }), /too many habits/);
  const maxed = Array.from({ length: 500 }, (_, i) => baseHabit({ name: `H${i}` }));
  assert.equal(normalize({ habits: maxed }).habits.length, 500);
});

test('normalize rejects non-object habit entries', () => {
  assert.throws(() => normalize({ habits: [null] }), /Habit 1 is invalid/);
  assert.throws(() => normalize({ habits: ['x'] }), /Habit 1 is invalid/);
});

test('normalize stamps root version and defaults missing sections', () => {
  const s = normalize({ habits: [] });
  assert.equal(s.version, VERSION);
  assert.deepEqual(s.gallery, []);
  assert.deepEqual(s.journal, {});
  assert.deepEqual(s.savedQuotes, []);
  assert.deepEqual(s.tasks, {});
  assert.deepEqual(s.settings, { theme: 'system' });
});

test('normalize ignores unknown root fields such as export metadata', () => {
  const s = normalize({ habits: [], app: 'Evrida', exportedAt: '2026-01-01T00:00:00Z', evil: '<script>' });
  assert.equal(s.app, undefined);
  assert.equal(s.evil, undefined);
});

// --- Habit fields ----------------------------------------------------------

test('normalize trims names and rejects empty or oversized ones', () => {
  assert.equal(normalize({ habits: [baseHabit({ name: '  Read 10 pages  ' })] }).habits[0].name, 'Read 10 pages');
  assert.throws(() => normalize({ habits: [baseHabit({ name: '   ' })] }), /invalid name/);
  assert.throws(() => normalize({ habits: [baseHabit({ name: 'x'.repeat(61) })] }), /invalid name/);
});

test('normalize accepts exactly-60-character names and numeric names', () => {
  assert.equal(normalize({ habits: [baseHabit({ name: 'x'.repeat(60) })] }).habits[0].name.length, 60);
  assert.equal(normalize({ habits: [baseHabit({ name: 42 })] }).habits[0].name, '42');
});

test('normalize enforces integer goals from 1 to 99', () => {
  assert.equal(normalize({ habits: [baseHabit({ goal: '5' })] }).habits[0].goal, 5);
  assert.equal(normalize({ habits: [baseHabit({ goal: 99 })] }).habits[0].goal, 99);
  assert.equal(normalize({ habits: [baseHabit({ goal: 0 })] }).habits[0].goal, 1); // falsy -> default
  assert.throws(() => normalize({ habits: [baseHabit({ goal: 100 })] }), /invalid target/);
  assert.throws(() => normalize({ habits: [baseHabit({ goal: -1 })] }), /invalid target/);
  assert.throws(() => normalize({ habits: [baseHabit({ goal: 2.5 })] }), /invalid target/);
  assert.throws(() => normalize({ habits: [baseHabit({ goal: 'abc' })] }), /invalid target/);
});

test('normalize keeps valid start dates and falls back to today otherwise', (t) => {
  setToday(t, 2026, 1, 15);
  assert.equal(normalize({ habits: [baseHabit({ start: '2026-01-05' })] }).habits[0].start, '2026-01-05');
  assert.equal(normalize({ habits: [baseHabit({ start: 'garbage' })] }).habits[0].start, '2026-01-15');
  assert.equal(normalize({ habits: [baseHabit()] }).habits[0].start, '2026-01-15');
});

test('normalize cleans scheduled days and falls back to all seven', () => {
  assert.deepEqual(normalize({ habits: [baseHabit({ days: [1, 3, 3, 0, 9, -1, 'x', '5' ] })] }).habits[0].days, [1, 3, 0, 5]);
  assert.deepEqual(normalize({ habits: [baseHabit({ days: [] })] }).habits[0].days, [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(normalize({ habits: [baseHabit({ days: 'nope' })] }).habits[0].days, [0, 1, 2, 3, 4, 5, 6]);
});

test('normalize sanitizes the done map: keys, ranges, and floors', () => {
  const h = normalize({
    habits: [baseHabit({
      done: {
        '2026-01-05': '2.9',   // string number, floored to 2
        '2026-01-06': 1000,    // above cap, dropped
        '2026-01-07': -1,      // negative, dropped
        '2026-01-08': 'x',     // not a number, dropped
        '2026-01-09': Infinity, // not finite, dropped
        'not-a-date': 3,       // bad key, dropped
        12345: 1,              // non-string key, bad shape, dropped
      },
    })],
  }).habits[0].done;
  assert.deepEqual(h, { '2026-01-05': 2 });
});

test('normalize ignores array-shaped done maps', () => {
  const h = normalize({ habits: [baseHabit({ done: [1, 2, 3] })] }).habits[0];
  assert.deepEqual(h.done, {});
});

test('normalize trims, caps, and defaults categories', () => {
  assert.equal(normalize({ habits: [baseHabit({ category: '  Learning  ' })] }).habits[0].category, 'Learning');
  assert.equal(normalize({ habits: [baseHabit({ category: 'x'.repeat(50) })] }).habits[0].category.length, 32);
  assert.equal(normalize({ habits: [baseHabit({ category: '   ' })] }).habits[0].category, 'General');
  assert.equal(normalize({ habits: [baseHabit({ category: null })] }).habits[0].category, 'General');
});

test('normalize whitelists icons and colors, with deterministic fallbacks', () => {
  assert.equal(normalize({ habits: [baseHabit({ icon: '\u{1F4A7}' })] }).habits[0].icon, EMOJIS[2]); // droplet is in the palette
  assert.equal(normalize({ habits: [baseHabit({ icon: '\u{1F680}' })] }).habits[0].icon, EMOJIS[0]); // not in palette
  assert.equal(normalize({ habits: [baseHabit({ color: '#000000' })] }).habits[0].color, COLORS[0]);
  assert.equal(
    normalize({ habits: [baseHabit(), baseHabit({ color: '#000000' })] }).habits[1].color,
    COLORS[1], // fallback color is positional
  );
});

// EMOJIS is the validation whitelist for a persisted `icon`, so it may only
// grow by appending. These tests guard against a future edit removing or
// reordering an entry, which would silently reset existing habits' icons.
const ORIGINAL_EMOJIS = [
  '📚', '🏃', '💧', '🧘', '💪', '🛏️', '🥗', '✍️',
  '🎸', '💤', '🧹', '🌱', '🚶', '🧠', '🎨', '🪥',
];

test('the original icon set is still present, in its original order', () => {
  assert.deepEqual(EMOJIS.slice(0, ORIGINAL_EMOJIS.length), ORIGINAL_EMOJIS);
});

test('the icon whitelist has no duplicates and no blank entries', () => {
  assert.equal(new Set(EMOJIS).size, EMOJIS.length);
  assert.ok(EMOJIS.every(e => typeof e === 'string' && e.trim().length > 0));
});

test('every icon in the whitelist survives normalization unchanged', () => {
  for (const icon of EMOJIS) {
    assert.equal(normalize({ habits: [baseHabit({ icon })] }).habits[0].icon, icon);
  }
});

test('newly added icons are accepted and retained', () => {
  // Chess pawn and controller represent the play/games group.
  for (const icon of ['♟️', '🎮', '🧩', '💰']) {
    assert.ok(EMOJIS.includes(icon), `${icon} should be in the whitelist`);
    assert.equal(normalize({ habits: [baseHabit({ icon })] }).habits[0].icon, icon);
  }
});

test('an icon outside the whitelist still falls back deterministically', () => {
  assert.equal(normalize({ habits: [baseHabit({ icon: '\u{1F9A4}' })] }).habits[0].icon, EMOJIS[0]);
});

test('normalize generates ids when missing and preserves valid ones', () => {
  const withId = normalize({ habits: [baseHabit({ id: 'custom-id' })] }).habits[0];
  assert.equal(withId.id, 'custom-id');
  const withoutId = normalize({ habits: [baseHabit()] }).habits[0];
  assert.equal(typeof withoutId.id, 'string');
  assert.ok(withoutId.id.startsWith('h'));
});

test('normalize retains a legacy art object only when it is an object', () => {
  assert.deepEqual(normalize({ habits: [baseHabit({ art: { v: 1 } })] }).habits[0].art, { v: 1 });
  assert.equal(normalize({ habits: [baseHabit({ art: 'text' })] }).habits[0].art, undefined);
});

test('normalize trims and caps the optional when and where parts', () => {
  const h = normalize({ habits: [baseHabit({ when: '  after lunch  ', where: '  at my desk  ' })] }).habits[0];
  assert.equal(h.when, 'after lunch');
  assert.equal(h.where, 'at my desk');
  assert.equal(normalize({ habits: [baseHabit({ when: 'x'.repeat(90) })] }).habits[0].when.length, 60);
  assert.equal(normalize({ habits: [baseHabit({ where: 'y'.repeat(90) })] }).habits[0].where.length, 60);
  assert.equal(normalize({ habits: [baseHabit({ when: 42 })] }).habits[0].when, '42');
});

test('normalize collapses internal whitespace in when and where', () => {
  const h = normalize({ habits: [baseHabit({ when: 'after   lunch\n', where: 'at\tmy   desk' })] }).habits[0];
  assert.equal(h.when, 'after lunch');
  assert.equal(h.where, 'at my desk');
});

test('normalize omits when and where when missing or blank', () => {
  const h = normalize({ habits: [baseHabit()] }).habits[0];
  assert.ok(!('when' in h));
  assert.ok(!('where' in h));
  assert.ok(!('when' in normalize({ habits: [baseHabit({ when: '   ' })] }).habits[0]));
  assert.ok(!('where' in normalize({ habits: [baseHabit({ where: null })] }).habits[0]));
});

test('normalize migrates a legacy cue into when and drops cue', () => {
  const h = normalize({ habits: [baseHabit({ cue: 'after I brush my teeth' })] }).habits[0];
  assert.equal(h.when, 'after I brush my teeth');
  assert.equal(h.cue, undefined);
  assert.ok(!('cue' in h));
});

test('normalize prefers an explicit when over a legacy cue', () => {
  const h = normalize({ habits: [baseHabit({ cue: 'old text', when: 'after lunch' })] }).habits[0];
  assert.equal(h.when, 'after lunch');
  assert.ok(!('cue' in h));
});

test('normalize stays idempotent after migrating a legacy cue', () => {
  const once = normalize({ habits: [baseHabit({ cue: 'after lunch' })] });
  assert.deepEqual(normalize(once), once);
});

test('normalize accepts version 6 and 7 backups (forward compatible)', () => {
  const v6 = normalize({ version: 6, habits: [baseHabit({ goal: 2, done: { '2026-01-05': 1 } })] });
  assert.equal(v6.version, VERSION);
  assert.deepEqual(v6.habits[0].done, { '2026-01-05': 1 });
  assert.equal(v6.habits[0].when, undefined);

  const v7 = normalize({ version: 7, habits: [baseHabit({ cue: 'after lunch, at my desk' })] });
  assert.equal(v7.version, VERSION);
  assert.equal(v7.habits[0].when, 'after lunch, at my desk');
});

test('normalize round-trips when and where through export-style JSON', () => {
  const state = normalize({ habits: [baseHabit({ when: 'after I pour my coffee', where: 'at the kitchen table' })] });
  const exported = JSON.parse(JSON.stringify({ ...state, app: 'Evrida', exportedAt: '2026-01-01T00:00:00Z' }));
  const out = normalize(exported).habits[0];
  assert.equal(out.when, 'after I pour my coffee');
  assert.equal(out.where, 'at the kitchen table');
});

test('cueSentence composes the implementation intention from present parts', () => {
  assert.equal(
    cueSentence({ name: 'read 10 pages', when: 'after lunch', where: 'at my desk' }),
    'I will read 10 pages after lunch at my desk',
  );
  assert.equal(cueSentence({ name: 'read 10 pages', when: 'after lunch' }), 'I will read 10 pages after lunch');
  assert.equal(cueSentence({ name: 'read 10 pages', where: 'at my desk' }), 'I will read 10 pages at my desk');
});

test('cueSentence returns an empty string without a when or where', () => {
  assert.equal(cueSentence({ name: 'read 10 pages' }), '');
  assert.equal(cueSentence({ name: 'read 10 pages', when: '  ', where: '' }), '');
  assert.equal(cueSentence({ name: '', when: 'after lunch' }), '');
  assert.equal(cueSentence({}), '');
});

test('cueSentence never emits a dangling preposition', () => {
  assert.equal(cueSentence({ name: 'stretch', when: 'after lunch', where: '   ' }), 'I will stretch after lunch');
  assert.equal(cueSentence({ name: 'stretch', where: '  at my desk  ' }), 'I will stretch at my desk');
});

// --- Gallery, journal, saved quotes, tasks, settings -----------------------

test('normalize filters gallery entries to the last 100 objects', () => {
  const g = normalize({ habits: [], gallery: [1, 'x', null, { a: 1 }] }).gallery;
  assert.deepEqual(g, [{ a: 1 }]);
  const many = normalize({ habits: [], gallery: Array.from({ length: 120 }, (_, i) => ({ i })) }).gallery;
  assert.equal(many.length, 100);
  assert.equal(many[99].i, 119); // keeps the most recent
});

test('normalize sanitizes journal entries: keys, lengths, and mood enum', () => {
  const j = normalize({
    habits: [],
    journal: {
      '2026-01-15': {
        note: 'n'.repeat(6000),
        wentWell: 'w'.repeat(2000),
        challenge: 'c'.repeat(2000),
        grateful: 'g'.repeat(2000),
        mood: 'ecstatic',
      },
      'not-a-date': { note: 'x' },
      '2026-01-16': 'not-an-object',
    },
  }).journal;
  assert.deepEqual(Object.keys(j), ['2026-01-15']);
  assert.equal(j['2026-01-15'].note.length, 5000);
  assert.equal(j['2026-01-15'].wentWell.length, 1500);
  assert.equal(j['2026-01-15'].challenge.length, 1500);
  assert.equal(j['2026-01-15'].grateful.length, 1500);
  assert.equal(j['2026-01-15'].mood, '');
  assert.equal(normalize({ habits: [], journal: { '2026-01-14': { mood: 'great' } } }).journal['2026-01-14'].mood, 'great');
});

test('normalize validates saved quote indexes against the quote list', () => {
  assert.deepEqual(normalize({ habits: [], savedQuotes: [0, QUOTES.length - 1] }).savedQuotes, [0, QUOTES.length - 1]);
  assert.deepEqual(normalize({ habits: [], savedQuotes: [QUOTES.length, -1, 1.5, 'x', NaN, '2', 2, 2] }).savedQuotes, [2]);
});

test('normalize sanitizes daily intentions: caps, lengths, and drops empty text', () => {
  const many = Array.from({ length: 130 }, (_, i) => ({ text: `task ${i}` }));
  const t1 = normalize({ habits: [], tasks: { '2026-01-15': many } }).tasks['2026-01-15'];
  assert.equal(t1.length, 100);
  assert.equal(t1[0].text, 'task 0');
  const t2 = normalize({
    habits: [],
    tasks: {
      '2026-01-15': [
        { text: '  trimmed  ', done: 1 },
        { text: '   ' },
        { text: 'x'.repeat(200) },
        'not-an-object',
        null,
      ],
      'bad-key': [{ text: 'x' }],
      '2026-01-16': 'not-an-array',
    },
  }).tasks;
  assert.deepEqual(Object.keys(t2), ['2026-01-15']);
  assert.equal(t2['2026-01-15'].length, 2);
  assert.equal(t2['2026-01-15'][0].text, 'trimmed');
  assert.equal(t2['2026-01-15'][0].done, true);
  assert.equal(t2['2026-01-15'][1].text.length, 120);
  assert.equal(typeof t2['2026-01-15'][0].id, 'string');
});

test('normalize whitelists the theme setting', () => {
  assert.equal(normalize({ habits: [], settings: { theme: 'dark' } }).settings.theme, 'dark');
  assert.equal(normalize({ habits: [], settings: { theme: 'blue' } }).settings.theme, 'system');
  assert.equal(normalize({ habits: [] }).settings.theme, 'system');
});

// --- Idempotence and round-trip -------------------------------------------

test('normalize is a no-op on its own output (idempotent)', () => {
  const rich = normalize({
    habits: [baseHabit({ goal: 2, days: [1, 3], done: { '2026-01-05': 2 }, category: 'Learning', when: 'after lunch', where: 'at my desk' })],
    gallery: [{ i: 1 }],
    journal: { '2026-01-15': { note: 'hello', mood: 'good' } },
    savedQuotes: [1],
    tasks: { '2026-01-15': [{ text: 'drink water' }] },
    settings: { theme: 'dark' },
  });
  assert.deepEqual(normalize(rich), rich);
});

test('normalize round-trips the default state unchanged', () => {
  assert.deepEqual(normalize(defaultState()), defaultState());
});

test('normalize leaves module state untouched when given junk (safe to reject)', () => {
  setState({ habits: [] });
  assert.throws(() => normalize({ nope: true }));
  assert.deepEqual(defaultState().habits, []);
});
