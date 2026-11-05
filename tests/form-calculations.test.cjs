const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const context = {};
vm.createContext(context);
vm.runInContext(readFileSync(resolve(__dirname, '../assets/js/form-calculations.js'), 'utf8') + '\nthis.calc = FormCalc; this.words = numToChinese;', context);
const { calc, words } = context;
const plain = value => JSON.parse(JSON.stringify(value));
const period = (overrides = {}) => ({ startDate: '2026-11-05', startHour: '18', startMinute: '0', endDate: '2026-11-05', endHour: '20', endMinute: '30', restMinutes: '0', ...overrides });

test('period minutes handle rest, overnight periods and incomplete or invalid input', () => {
  assert.equal(calc.periodMinutes(period()).minutes, 150);
  assert.equal(calc.periodMinutes(period({ restMinutes: '30' })).minutes, 120);
  assert.equal(calc.periodMinutes(period({ endDate: '2026-11-06', endHour: '1', endMinute: '0' })).minutes, 420);
  assert.deepEqual(plain(calc.periodMinutes(period({ endHour: '' }))), { minutes: null, invalid: false });
  assert.equal(calc.periodMinutes(period({ endHour: '17' })).invalid, true);
  assert.equal(calc.periodMinutes(period({ endHour: '18', endMinute: '30', restMinutes: '30' })).invalid, true);
  assert.equal(calc.periodMinutes(period({ startHour: '0', endHour: '1', endMinute: '0' })).minutes, 60);
});

test('trip days count both ends and reject a return before departure', () => {
  assert.deepEqual(plain(calc.tripDays('2026-11-05', '2026-11-05')), { days: 1, nights: 0, invalid: false });
  assert.equal(calc.tripDays('2026-12-30', '2027-01-02').days, 4);
  assert.equal(calc.tripDays('2026-11-05', '2026-11-04').invalid, true);
  assert.equal(calc.tripDays('', '2026-11-04').days, null);
});

test('tax totals support untaxed, taxed and exempt prices', () => {
  assert.deepEqual(plain(calc.taxTotals(1000, 'excl')), { net: 1000, tax: 50, total: 1050 });
  assert.deepEqual(plain(calc.taxTotals(1050, 'incl')), { net: 1000, tax: 50, total: 1050 });
  assert.deepEqual(plain(calc.taxTotals(1000, 'free')), { net: 1000, tax: 0, total: 1000 });
  assert.equal(calc.lineAmount('2', '32000'), 64000);
  assert.equal(calc.lineAmount('', '100'), 0);
});

test('original forms default to the local date rather than UTC', () => {
  for (const name of ['leave', 'payment']) {
    const script = readFileSync(resolve(__dirname, `../assets/js/forms/${name}_request_form.js`), 'utf8');
    const page = readFileSync(resolve(__dirname, `../forms/${name}_request_form.html`), 'utf8');
    assert.doesNotMatch(script, /toISOString/);
    assert.ok(page.indexOf('form-calculations.js') < page.indexOf(`forms/${name}_request_form.js`) && page.includes('form-calculations.js'));
  }
});

test('overtime form carries no labor-law guidance, since company rules differ', () => {
  const page = readFileSync(resolve(__dirname, '../forms/overtime_request_form.html'), 'utf8');
  const script = readFileSync(resolve(__dirname, '../assets/js/forms/overtime_request_form.js'), 'utf8');
  for (const text of [page, script]) assert.doesNotMatch(text, /勞基法|加給|補假|加倍/);
});

test('amount words and local dates stay stable after moving to the shared module', () => {
  assert.equal(words(84000), '捌萬肆仟元整');
  assert.equal(words(50005), '伍萬零伍元整');
  assert.equal(words(0), '');
  assert.equal(calc.localDate(new Date(2026, 0, 5, 0, 30)), '2026-01-05');
  assert.equal(calc.weekday('2026-11-05'), '星期四');
});
