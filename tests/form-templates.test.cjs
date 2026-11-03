const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const source = readFileSync(resolve(__dirname, '../assets/js/form-templates.js'), 'utf8');
function setup() {
  const storage = new Map();
  const context = { crypto: { randomUUID }, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
  vm.createContext(context); vm.runInContext(source + '\nthis.api = FormTemplates;', context);
  return { api: context.api, storage };
}
test('payment templates exclude transaction and applicant fields while retaining fixed content', () => {
  const { api } = setup();
  const saved = api.save('payment', '每月雲端費', { applicant: '甲', department: '部門', docNo: 'OLD', reqDate: '2020-01-01', voucherNo: 'AB123', voucherDate: '2020-01-01', reason: '雲端費', amtGross: '1000', payee: '公司', bankAccount: '00123', paymentNote: '備註', attachTypes: ['invoice'] });
  assert.equal(saved.data.reason, '雲端費'); assert.equal(saved.data.bankAccount, '00123');
  for (const key of ['applicant', 'department', 'docNo', 'reqDate', 'voucherNo', 'voucherDate']) assert.equal(Object.hasOwn(saved.data, key), false);
});
test('leave templates preserve recurring times and reasons but exclude dates and identity', () => {
  const { api } = setup();
  const saved = api.save('leave', '上午特休', { applicant: '甲', agent: '代理人', contactPhone: '0900', startDate: '2020-01-01', endDate: '2020-01-01', leaveDays: '5', startHour: '09', endHour: '12', leaveType: 'annual', reason: '固定事由', remark: '備註' });
  assert.equal(saved.data.startHour, '09'); assert.equal(saved.data.reason, '固定事由');
  for (const key of ['applicant', 'agent', 'contactPhone', 'startDate', 'endDate', 'leaveDays']) assert.equal(Object.hasOwn(saved.data, key), false);
});
test('20-template capacity never evicts records and supports update, rename and delete', () => {
  const { api, storage } = setup();
  const saved = Array.from({ length: 20 }, (_, i) => api.save('payment', `項目${i}`, { reason: String(i) }));
  const before = storage.get(api.KEY);
  assert.throws(() => api.save('payment', '第二十一筆', {}), /已滿/);
  assert.equal(storage.get(api.KEY), before);
  const updated = api.save('payment', '更新項目', { reason: '更新' }, saved[0].id);
  assert.equal(updated.createdAt, saved[0].createdAt);
  api.rename('payment', updated.id, '重新命名'); assert.equal(api.load('payment')[0].title, '重新命名');
  api.remove('payment', updated.id); assert.equal(api.load('payment').length, 19);
  assert.throws(() => api.save('payment', 'stale', {}, updated.id), /已被刪除/);
  assert.equal(api.load('leave').length, 0);
});
test('merge preserves same-name local templates, remaps ID collisions and checks final capacity', () => {
  const { api } = setup();
  const record = api.save('payment', '現有範本', { reason: '現有內容' });
  const merged = api.merge({ payment: [record], leave: [] }, { payment: [{ ...record, id: 'remote', data: { reason: '其他內容' } }, { ...record, title: '新範本' }], leave: [] });
  assert.equal(merged.payment.length, 2); assert.equal(merged.payment[0].data.reason, '現有內容'); assert.notEqual(merged.payment[1].id, record.id);
  assert.throws(() => api.validateAll({ payment: Array.from({ length: 21 }, (_, i) => ({ ...record, id: 't_' + i })) }), /最多/);
});
test('invalid content cannot overwrite stored templates', () => {
  const { api, storage } = setup();
  api.save('leave', '範本', { reason: '原內容' }); const before = storage.get(api.KEY);
  assert.throws(() => api.save('leave', '範本', { reason: '其他' }), /已存在/);
  assert.throws(() => api.save('payment', 'bad', { attachTypes: 'invoice' }));
  assert.throws(() => api.validateAll({ leave: null }));
  const record = api.load('leave')[0];
  assert.throws(() => api.validateAll({ leave: [record, { ...record, id: 'different' }] }), /重複/);
  assert.equal(storage.get(api.KEY), before);
});
