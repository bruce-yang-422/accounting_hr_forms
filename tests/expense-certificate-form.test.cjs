const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const read = path => readFileSync(resolve(__dirname, '..', path), 'utf8');

function setup() {
  const fields = new Map();
  const byId = id => {
    if (!fields.has(id)) fields.set(id, { value: '', validity: { valid: true } });
    return fields.get(id);
  };
  let config;
  const context = { FormPage: {
    byId, value: id => byId(id).value.trim(), text: (id, content) => { byId(id).textContent = content; },
    setValues: values => Object.entries(values).forEach(([id, value]) => { byId(id).value = value; }),
    setup: options => { config = options; },
  } };
  vm.createContext(context);
  vm.runInContext(read('assets/js/form-calculations.js'), context);
  vm.runInContext(read('assets/js/forms/expense_certificate_form.js'), context);
  const missing = () => config.sections.flat().filter(rule => rule.ok ? !rule.ok() : !byId(rule.id).value);
  return { config, byId, missing };
}

test('expense certificates require a voucher explanation and render ROC dates with upper-case amount digits', () => {
  const { config, byId, missing } = setup();
  config.sample(); byId('reqDate').value = '2026-11-06';
  config.refresh(); config.preview(); assert.equal(missing().length, 0);
  assert.equal(byId('pv-date').textContent, '中華民國 115 年 11 月 6 日');
  assert.equal(byId('amountChinese').value, '壹仟伍佰元整');
  assert.equal(byId('pv-digit-2').textContent, '壹');
  assert.equal(byId('pv-digit-3').textContent, '伍');
  assert.equal(byId('ev-money-units').hidden, false);
  assert.equal(byId('pv-amount').textContent, 'NT$ 1,500');
  byId('noVoucherReason').value = ''; assert.ok(missing().some(rule => rule.id === 'noVoucherReason'));
});

test('fractional and large amounts print fully instead of overflowing six-digit columns or retaining old digits', () => {
  const { config, byId } = setup(); config.sample(); byId('reqDate').value = '2026-11-06';
  config.refresh(); config.preview();
  for (const amount of ['123.45', '1000000']) {
    byId('amount').value = amount; config.refresh(); config.preview();
    assert.equal(byId('ev-money-units').hidden, true);
    assert.equal(byId('ev-money-text').hidden, false);
    assert.equal(byId('pv-amountChinese').textContent, byId('amountChinese').value);
    assert.equal(byId('pv-digit-2').textContent, '');
  }
  assert.equal(byId('pv-amountChinese').textContent, '壹佰萬元整');
});

test('invalid amounts are rejected and cannot generate a misleading upper-case amount', () => {
  const { config, byId, missing } = setup(); config.sample(); byId('reqDate').value = '2026-11-06';
  for (const value of ['', '0', '-1', 'Infinity', '1000000000000']) {
    byId('amount').value = value; config.refresh();
    assert.equal(byId('amountChinese').value, '');
    assert.ok(missing().some(rule => /支出金額/.test(rule.label)));
  }
});

test('expense templates exclude transaction identifiers; signature defaults match the paper form', () => {
  const context = {}; vm.createContext(context);
  vm.runInContext(read('assets/js/form-templates.js') + '\nthis.templates = FormTemplates;', context);
  vm.runInContext(read('assets/js/signoff-store.js') + '\nthis.signoffs = SignoffStore; this.reviews = ReviewStore;', context);
  const fields = context.templates.extract('expense', { reqDate: '2026-11-06', docNo: 'OLD', acctCategory: '雜支',
    reason: '搬運費', noVoucherReason: '無法取得收據', amount: '1500', amountChinese: '舊金額' });
  assert.equal(fields.noVoucherReason, '無法取得收據');
  for (const key of ['reqDate', 'docNo', 'amountChinese']) assert.equal(Object.hasOwn(fields, key), false);
  assert.deepEqual(JSON.parse(JSON.stringify(context.signoffs.get('expense'))), ['核准', '覆核', '會計', '出納', '經辦', '製單']);
  assert.equal(context.reviews.get('expense').length, 0);
});
