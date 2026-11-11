const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const read = path => readFileSync(resolve(__dirname, '..', path), 'utf8');
const forms = ['outing_request', 'petty_cash_request', 'supply_requisition', 'purchase_acceptance'];

function setup(slug) {
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
  for (const file of ['form-calculations.js', 'operational-forms.js', `forms/${slug}_form.js`]) vm.runInContext(read(`assets/js/${file}`), context);
  byId('reqDate').value = '2026-11-11';
  config.sample();
  const missing = () => config.sections.flat().filter(rule => (!rule.when || rule.when()) && (rule.ok ? !rule.ok() : !byId(rule.id).value));
  return { config, byId, missing };
}

test('all four administrative samples validate and render their own applicant and purpose', () => {
  for (const slug of forms) {
    const { config, byId, missing } = setup(slug);
    config.refresh?.(); config.preview();
    assert.equal(missing().length, 0, slug);
    assert.equal(byId('pv-applicant').textContent, '陳小華');
    assert.equal(byId('pv-reason').textContent, byId('reason').value);
    byId('reqDate').validity.valid = false;
    assert.ok(missing().length > 0);
  }
});

test('administrative pages wire their scripts, sign-off slots, accessible fields and offline assets', () => {
  const worker = read('service-worker.js');
  for (const [slug, type] of [['outing_request', 'outing'], ['petty_cash_request', 'petty_cash'], ['supply_requisition', 'supply'], ['purchase_acceptance', 'acceptance']]) {
    const html = read(`forms/${slug}_form.html`);
    assert.ok(html.includes(`data-signoff="${type}"`));
    assert.ok(html.includes(`data-review="${type}"`));
    assert.ok(html.indexOf('operational-forms.js') < html.indexOf(`forms/${slug}_form.js`));
    assert.ok(worker.includes(`forms/${slug}_form.html`));
    assert.ok(worker.includes(`assets/js/forms/${slug}_form.js`));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, `${slug}: duplicate IDs`);
    for (const match of html.matchAll(/<label[^>]*for="([^"]+)"/g)) assert.ok(ids.includes(match[1]));
  }
});

test('outing calculates same-day duration and refuses reversed or incomplete times', () => {
  const { config, byId, missing } = setup('outing_request');
  config.refresh(); assert.equal(byId('duration').value, '2.5 小時');
  for (const endTime of ['09:00', '08:59', '']) {
    byId('endTime').value = endTime;
    config.refresh(); assert.equal(byId('duration').value, '');
    assert.ok(missing().length > 0);
  }
});


test('petty cash adds cents accurately and rejects incomplete rows, invalid values, and excessive totals', () => {
  const { config, byId, missing } = setup('petty_cash_request');
  byId('item1Amount').value = '0.10'; byId('item2Amount').value = '0.20';
  config.refresh(); assert.equal(missing().length, 0);
  assert.equal(byId('amountChinese').value, '參角整');
  for (const amount of ['0', '-1', 'NaN', 'Infinity', '1000000000000']) {
    byId('item1Amount').value = amount; config.refresh();
    assert.ok(missing().length > 0, amount);
    assert.equal(byId('cashTotal').value, '');
  }
  byId('item1Amount').value = '1'; byId('item3Voucher').value = 'AB123';
  assert.ok(missing().length > 0, 'voucher-only rows need a name and amount');
  byId('item3Voucher').value = ''; byId('item1Amount').validity.valid = false;
  assert.ok(missing().length > 0, 'native precision and range constraints are respected');
});

test('supply rows require names, positive quantities and units even when only a specification is entered', () => {
  const { byId, missing } = setup('supply_requisition');
  byId('item3Spec').value = 'A4'; assert.ok(missing().length > 0);
  byId('item3Spec').value = ''; byId('item1Unit').value = ''; assert.ok(missing().length > 0);
  byId('item1Unit').value = '包'; byId('item1Qty').value = '0'; assert.ok(missing().length > 0);
});

test('acceptance rejects inconsistent quantities and requires an explanation for partial or rejected deliveries', () => {
  const { byId, missing } = setup('purchase_acceptance');
  byId('item1Accepted').value = '11'; assert.ok(missing().length > 0);
  byId('item1Accepted').value = '8'; assert.ok(missing().length > 0, 'cannot mark a partial delivery as fully accepted');
  byId('result').value = '部分合格'; assert.ok(missing().some(rule => rule.id === 'issueReason'));
  byId('issueReason').value = '兩包外箱破損，退回補貨'; assert.equal(missing().length, 0);
  byId('result').value = '不合格'; assert.ok(missing().length > 0);
  byId('item1Accepted').value = '0'; assert.equal(missing().length, 0);
  byId('item1Received').value = '12'; byId('item1Accepted').value = '12';
  byId('result').value = '合格'; assert.ok(missing().length > 0, 'overdelivery needs an explanation and partial result');
});

test('administrative templates exclude transaction identifiers, dates and previous acceptance results', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(read('assets/js/form-templates.js') + '\nthis.templates = FormTemplates;', context);
  for (const type of ['outing', 'petty_cash', 'supply', 'acceptance']) {
    const data = context.templates.extract(type, { applicant: '舊姓名', docNo: 'OLD', reqDate: '2020-01-01',
      outingDate: '2020-01-01', neededDate: '2020-01-01', settleDate: '2020-01-01', inspectionDate: '2020-01-01',
      orderNo: 'PO-OLD', item1Voucher: 'AB123', receiverName: '舊領款人', result: '合格', issueReason: '舊異常',
      item1Received: '10', item1Accepted: '10', reviewer: '王主管', reviewDate: '2026-11-11', reviewStatus: '同意', reviewComment: '舊意見', reason: '固定用途' });
    assert.deepEqual(JSON.parse(JSON.stringify(data)), { reason: '固定用途' }, type);
  }
});
