const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const read = path => readFileSync(resolve(__dirname, '..', path), 'utf8');

function setup() {
  const fields = new Map();
  const byId = id => {
    if (!fields.has(id)) fields.set(id, { value: '', validity: { valid: true }, style: {} });
    return fields.get(id);
  };
  let config, method = '';
  const context = { FormPage: {
    byId, value: id => byId(id).value.trim(), radio: () => method,
    text: (id, text) => { byId(id).textContent = text; },
    setValues: values => Object.entries(values).forEach(([id, value]) => { byId(id).value = value; }),
    pick: (name, value) => { method = value; }, setup: options => { config = options; },
  } };
  vm.createContext(context);
  vm.runInContext(read('assets/js/form-calculations.js'), context);
  vm.runInContext(read('assets/js/forms/simple_receipt_form.js'), context);
  const missing = () => config.sections.flat().filter(rule => (!rule.when || rule.when()) && (rule.ok ? !rule.ok() : !byId(rule.id).value));
  return { config, byId, missing, pick: value => { method = value; } };
}

test('personal receipts calculate upper-case amounts and need no tax ID or phone number', () => {
  const { config, byId, missing } = setup();
  config.sample(); byId('reqDate').value = '2026-11-06'; byId('contactPhone').value = '';
  config.refresh(); config.preview();
  assert.equal(missing().length, 0);
  assert.equal(byId('amountChinese').value, '壹仟伍佰元整');
  assert.equal(byId('pv-amount').textContent, '1,500');
  assert.equal(byId('pv-date').textContent, '中華民國 115 年 11 月 6 日');
  assert.equal(byId('pv-check-cash').style.display, '');
  assert.equal(byId('pv-check-transfer').style.display, 'none');
  byId('amount').value = '123.45'; config.refresh();
  assert.equal(byId('amountChinese').value, '壹佰貳拾參元肆角伍分');
});

test('transfer keeps leading zeros, other methods need a description, cash preview hides bank details', () => {
  const { config, byId, missing, pick } = setup();
  config.sample(); byId('reqDate').value = '2026-11-06';
  pick('transfer'); byId('bankAccount').value = '001234567890'; byId('bankName').value = '郵局'; byId('bankBranch').value = '中正支局';
  config.preview(); assert.equal(byId('pv-bankAccount').textContent, '001234567890');
  assert.equal(byId('pv-bankBranch').textContent, '中正支局');
  assert.equal(byId('pv-transfer').hidden, false); assert.equal(missing().length, 0);
  byId('bankAccount').value = 'abc'; assert.ok(missing().some(rule => /帳號/.test(rule.label)));
  pick('other'); assert.ok(missing().some(rule => rule.label === '其他付款方式'));
  byId('methodOther').value = '電子支付'; config.preview();
  assert.equal(byId('pv-other').textContent, '電子支付');
  pick('cash'); config.preview(); assert.equal(byId('pv-transfer').hidden, true);
  assert.equal(byId('pv-bankAccount').textContent, '');
  assert.equal(byId('pv-bankBranch').textContent, '');
  assert.equal(byId('pv-other').hidden, true);
});

test('invalid amounts are rejected and cannot produce an upper-case amount', () => {
  const { config, byId, missing } = setup();
  config.sample(); byId('reqDate').value = '2026-11-06';
  for (const amount of ['', '0', '-1', 'Infinity', '1000000000000']) {
    byId('amount').value = amount; config.refresh();
    assert.ok(missing().some(rule => /收到款項/.test(rule.label)));
    assert.equal(byId('amountChinese').value, '');
  }
  byId('amount').value = '1.234'; byId('amount').validity.valid = false;
  assert.ok(missing().some(rule => /收到款項/.test(rule.label)));
});

test('old transfer records keep their last five digits explicitly labelled until a full account is supplied', () => {
  const { config, byId, pick } = setup();
  config.sample(); byId('reqDate').value = '2026-11-06'; pick('transfer');
  byId('accountLast5').value = '00123'; config.preview();
  assert.equal(byId('pv-legacyAccount').hidden, false);
  assert.equal(byId('pv-legacyAccount').textContent, '舊紀錄帳號末五碼：00123');
  assert.equal(byId('pv-bankAccount').textContent, '');
  byId('bankAccount').value = '001234567890'; config.preview();
  assert.equal(byId('pv-legacyAccount').hidden, true);
  assert.equal(byId('pv-bankAccount').textContent, '001234567890');
});

test('simple receipt templates exclude dates, document numbers and derived amounts', () => {
  const context = {}; vm.createContext(context);
  vm.runInContext(read('assets/js/form-templates.js') + '\nthis.api = FormTemplates;', context);
  const payload = context.api.extract('simple_receipt', { payer: '甲', recipient: '乙', amount: '100',
    payMethod: 'transfer', bankName: '郵局', bankBranch: '中正支局', bankAccount: '001234567890', reqDate: '2026-11-06', docNo: 'OLD', amountChinese: '錯誤' });
  assert.equal(payload.bankAccount, '001234567890'); assert.equal(payload.bankBranch, '中正支局'); assert.equal(payload.amount, '100');
  for (const key of ['reqDate', 'docNo', 'amountChinese']) assert.equal(Object.hasOwn(payload, key), false);
});
