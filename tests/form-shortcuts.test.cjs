const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const source = readFileSync(resolve(root, 'assets/js/form-shortcuts-store.js'), 'utf8');
function setup() {
  const storage = new Map();
  const context = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
  vm.createContext(context); vm.runInContext(source + '\nthis.api = FormShortcuts;', context);
  return { api: context.api, storage };
}
const plain = value => JSON.parse(JSON.stringify(value));

test('all shortcut catalog links resolve to existing forms with usage tracking enabled', () => {
  const { api } = setup();
  assert.equal(api.FORMS.length, 12);
  assert.equal(new Set(api.FORMS.map(form => form.type)).size, 12);
  api.FORMS.forEach(form => {
    assert.ok(existsSync(resolve(root, form.path)));
    assert.match(readFileSync(resolve(root, form.path), 'utf8'), /assets\/js\/form-shortcuts-store\.js/);
  });
});

test('favorites can be added and removed independently of usage history', () => {
  const { api } = setup();
  assert.deepEqual(plain(api.favorites()), []);
  api.toggleFavorite('leave'); api.toggleFavorite('supply'); api.visit('payment');
  assert.deepEqual(plain(api.favorites()), ['leave', 'supply']);
  api.toggleFavorite('leave');
  assert.deepEqual(plain(api.favorites()), ['supply']);
  assert.deepEqual(plain(api.recent().map(record => record.type)), ['payment']);
  assert.throws(() => api.toggleFavorite('../outside'));
});

test('usage history orders forms by last visit and deduplicates repeated visits', () => {
  const { api, storage } = setup();
  storage.set(api.RECENT_KEY, JSON.stringify([
    { type: 'leave', usedAt: '2026-11-10T01:00:00Z' },
    { type: 'supply', usedAt: '2026-11-11T01:00:00Z' },
    { type: 'leave', usedAt: '2026-11-09T01:00:00Z' },
  ]));
  assert.deepEqual(plain(api.recent().map(record => record.type)), ['supply', 'leave']);
  api.visit('leave'); api.visit('leave');
  assert.equal(api.recent().filter(record => record.type === 'leave').length, 1);
  assert.throws(() => api.visit('unknown'));
});

test('corrupt shortcut data is reported without overwriting it', () => {
  const { api, storage } = setup();
  for (const bad of ['{broken', '{}', '["unknown"]']) {
    storage.set(api.FAVORITES_KEY, bad);
    assert.throws(() => api.toggleFavorite('leave'));
    assert.equal(storage.get(api.FAVORITES_KEY), bad);
  }
  for (const bad of ['{}', '[null]', '[{"type":"leave","usedAt":"invalid"}]']) {
    storage.set(api.RECENT_KEY, bad);
    assert.throws(() => api.visit('leave'));
    assert.equal(storage.get(api.RECENT_KEY), bad);
  }
});
