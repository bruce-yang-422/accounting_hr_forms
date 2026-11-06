const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const read = path => readFileSync(resolve(__dirname, '..', path), 'utf8');

function setup() {
  const fields = new Map();
  const byId = id => {
    if (!fields.has(id)) fields.set(id, { value: '', validity: { valid: true }, checked: true, children: [],
      replaceChildren() { this.children = []; }, append(child) { this.children.push(child); } });
    return fields.get(id);
  };
  let config;
  const context = { document: { createElement: () => ({ textContent: '' }) }, FormPage: {
    byId, value: id => byId(id).value.trim(), text: (id, value) => { byId(id).textContent = value; },
    setValues: values => Object.entries(values).forEach(([id, value]) => { byId(id).value = value; }),
    setup: options => { config = options; },
  } };
  vm.createContext(context);
  vm.runInContext(read('assets/js/form-calculations.js'), context);
  vm.runInContext(read('assets/js/forms/receipt_form.js'), context);
  const missing = () => config.sections.flat().filter(rule => rule.ok ? !rule.ok() : !byId(rule.id).value).map(rule => rule.label);
  return { config, byId, missing };
}

test('receipt rounds each line before summing, formats ROC dates and preserves leading tax ID zeros', () => {
  const { config, byId, missing } = setup();
  config.sample(); byId('reqDate').value = '2026-11-06'; byId('sellerTaxId').value = '01234567';
  config.refresh(); config.preview();
  assert.equal(missing().length, 0);
  assert.equal(byId('amountTotal').value, '660');
  assert.equal(byId('amountChinese').value, '陸佰陸拾元整');
  assert.equal(byId('pv-date').textContent, '中華民國 115 年 11 月 6 日');
  assert.equal(byId('pv-sellerTaxId').children.map(box => box.textContent).join(''), '01234567');
  assert.equal(byId('pv-item7Total').textContent, '');
  byId('item1Qty').value = '1.5'; byId('item1Price').value = '0.33';
  byId('item2Qty').value = '1'; byId('item2Price').value = '0.01';
  config.refresh(); assert.equal(byId('amountTotal').value, '0.51');
  byId('paid').checked = false; config.preview(); assert.equal(byId('pv-paid').hidden, true);
});

test('receipt refuses empty, partial, negative and excessive amounts before preview', () => {
  const { config, byId, missing } = setup();
  assert.ok(missing().length);
  config.sample(); byId('reqDate').value = '2026-11-06';
  byId('item3Name').value = '未完整填寫'; assert.match(missing().join(), /第 3 項/);
  byId('item3Name').value = ''; byId('item1Price').value = '-1'; assert.match(missing().join(), /第 1 項/);
  byId('item1Qty').value = '999999'; byId('item1Price').value = '999999999';
  assert.match(missing().join(), /小於一兆/);
  byId('sellerTaxId').value = '123'; assert.match(missing().join(), /8 碼/);
});

test('receipt templates retain payment choice and items but exclude transaction identifiers and derived amounts', () => {
  const context = {}; vm.createContext(context);
  vm.runInContext(read('assets/js/form-templates.js') + '\nthis.api = FormTemplates;', context);
  const payload = JSON.parse(JSON.stringify(context.api.extract('receipt', {
    buyer: '甲公司', item1Name: '文具', item1Qty: '2', item1Price: '10', paid: [],
    reqDate: '2026-11-06', docNo: 'R001', amountTotal: '999',
  })));
  assert.deepEqual(payload, { buyer: '甲公司', item1Name: '文具', item1Qty: '2', item1Price: '10', paid: [] });
});
