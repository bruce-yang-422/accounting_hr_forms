const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const source = readFileSync(resolve(__dirname, '../assets/js/form-recent-records.js'), 'utf8');
function setup() {
  const storage = new Map();
  const context = { crypto: { randomUUID }, localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } };
  vm.createContext(context);
  vm.runInContext(source + '\nthis.api = FormRecentRecords;', context);
  return { api: context.api, storage };
}

test('draft capacity never evicts existing drafts; updating a full library preserves creation time', () => {
  const { api, storage } = setup();
  const drafts = Array.from({ length: 20 }, (_, i) => api.saveDraft('payment', `草稿 ${i}`, { applicant: '甲', reason: String(i) }));
  const before = storage.get('hr_form_draft_payment');
  assert.throws(() => api.saveDraft('payment', '第二十一筆', {}), /已滿/);
  assert.equal(storage.get('hr_form_draft_payment'), before);
  const updated = api.saveDraft('payment', '更新名稱', { applicant: '乙' }, drafts[0].id);
  assert.equal(updated.createdAt, drafts[0].createdAt);
  assert.equal(updated.id, drafts[0].id);
  assert.equal(api.loadDrafts('payment').length, 20);
});

test('rename keeps content; delete frees a slot and types remain isolated', () => {
  const { api } = setup();
  const payment = api.saveDraft('payment', '舊名稱', { reason: '付款內容' });
  const leave = api.saveDraft('leave', '請假', { reason: '請假內容' });
  api.renameDraft('payment', payment.id, '新名稱');
  assert.equal(api.loadDrafts('payment')[0].title, '新名稱');
  assert.equal(api.loadDrafts('payment')[0].data.reason, '付款內容');
  assert.throws(() => api.renameDraft('payment', payment.id, '  '));
  api.deleteDraft('payment', payment.id);
  assert.equal(api.loadDrafts('payment').length, 0);
  assert.equal(api.loadDrafts('leave')[0].id, leave.id);
  assert.throws(() => api.saveDraft('payment', 'stale', {}, payment.id), /已被刪除/);
});

test('old drafts are retained and malformed storage cannot be overwritten', () => {
  const { api, storage } = setup();
  const old = [{ id: 'd_123', title: '舊草稿', data: { applicant: '甲' }, createdAt: '2026-05-01T00:00:00Z' }];
  storage.set('hr_form_draft_leave', JSON.stringify(old));
  assert.equal(api.loadDrafts('leave')[0].id, 'd_123');
  assert.equal(api.saveDraft('leave', '更新', {}, 'd_123').createdAt, old[0].createdAt);
  storage.set('hr_form_draft_leave', '{broken');
  assert.throws(() => api.saveDraft('leave', '新草稿', {}));
  assert.equal(storage.get('hr_form_draft_leave'), '{broken');
});

test('storage failures propagate without returning a saved draft', () => {
  const { api, storage } = setup();
  storage.set('hr_form_draft_leave', '[]');
  // The same API can run with denied storage without reporting false success.
  const context = { crypto: { randomUUID }, localStorage: { getItem: () => '[]', setItem() { throw new Error('quota'); } } };
  vm.createContext(context); vm.runInContext(source + '\nthis.api = FormRecentRecords;', context);
  assert.throws(() => context.api.saveDraft('leave', '未寫入', {}), /quota/);
  assert.equal(api.loadDrafts('leave').length, 0);
});

test('recent completion history keeps 20 records and updating or deleting preserves other records', () => {
  const { api } = setup();
  const records = Array.from({ length: 21 }, (_, i) => api.save('payment', `已完成 ${i}`, { reason: String(i) }));
  assert.equal(api.load('payment').length, 20);
  assert.equal(api.load('payment').some(record => record.id === records[0].id), false);
  const updated = api.save('payment', '更新', { reason: '更新' }, records[5].id);
  assert.equal(updated.createdAt, records[5].createdAt);
  assert.equal(api.load('payment').length, 20);
  api.deleteRecent('payment', updated.id); assert.equal(api.load('payment').length, 19);
  assert.equal(api.load('leave').length, 0);
});
