const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const source = readFileSync(resolve(__dirname, '../assets/js/payee-store.js'), 'utf8');
const company = { payee: '測試公司', payeeType: 'company', payMethod: 'transfer', taxId: '12345678', bankName: '測試銀行', bankBranch: '測試分行', bankAccount: '00123456' };
function setup(initial) {
  const storage = new Map(initial === undefined ? [] : [['yijia_payee_favorites', JSON.stringify(initial)]]);
  const context = { window: { dispatchEvent() {} }, Event: class {}, crypto: { randomUUID }, localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } };
  vm.createContext(context); vm.runInContext(source + '\nthis.api = PayeeStore;', context);
  return { api: context.api, storage, context };
}
test('existing records remain available; edits preserve ID, account zeros and unrelated recipients', () => {
  const { api } = setup([{ id: 'old_id', ...company }]);
  const added = api.save({ ...company, payee: '第二家公司' });
  const edited = api.save({ ...company, payee: '更名公司', bankBranch: '新分行' }, 'old_id');
  assert.equal(edited.id, 'old_id');
  assert.equal(edited.bankAccount, '00123456');
  assert.equal(api.getAll().length, 2);
  assert.equal(api.getAll()[1].id, added.id);
  api.remove('old_id'); assert.equal(api.getAll().length, 1);
});
test('cash and employee records do not retain bank or tax data', () => {
  const { api } = setup();
  const record = api.save({ ...company, payee: ' 員工甲 ', payeeType: 'employee', payMethod: 'cash' });
  assert.equal(record.payee, '員工甲');
  assert.equal(record.taxId, '');
  assert.equal(record.bankName + record.bankBranch + record.bankAccount, '');
});
test('duplicates, missing bank details and stale edits never overwrite storage', () => {
  const { api, storage } = setup([{ id: 'old_id', ...company }]);
  const before = storage.get(api.KEY);
  assert.throws(() => api.save({ ...company, payee: ' 測試公司 ' }), /已存在/);
  assert.throws(() => api.save({ ...company, bankAccount: '' }, 'old_id'), /銀行及帳號/);
  assert.throws(() => api.save({ ...company, payee: '另一公司' }, 'missing'), /已被刪除/);
  assert.equal(storage.get(api.KEY), before);
});
test('malformed and denied storage report errors without false success', () => {
  const { api, storage, context } = setup();
  storage.set(api.KEY, '{broken');
  assert.throws(() => api.save(company), /無法讀取/);
  assert.equal(storage.get(api.KEY), '{broken');
  storage.delete(api.KEY);
  context.localStorage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => api.save(company), /quota/);
  assert.equal(storage.has(api.KEY), false);
});
