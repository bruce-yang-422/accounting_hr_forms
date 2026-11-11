const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const source = readFileSync(resolve(root, 'assets/js/signoff-store.js'), 'utf8');
function setup(initial) {
  const storage = new Map(initial === undefined ? [] : [['hr_form_signoffs', initial]]);
  const context = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
  vm.createContext(context); vm.runInContext(source + '\nthis.api = SignoffStore;', context);
  return { api: context.api, storage };
}
const plain = value => JSON.parse(JSON.stringify(value));

test('every form has one to six default boxes, and its page has a sign-off slot', () => {
  const { api } = setup();
  assert.equal(api.FORMS.length, 11);
  api.FORMS.forEach(form => {
    assert.ok(form.defaults.length >= 1 && form.defaults.length <= api.MAX_BOXES, form.id);
    form.defaults.forEach(name => assert.ok(name.length <= api.MAX_NAME, name));
  });
  for (const [page, slot] of [['leave', 'leave'], ['payment', 'payment'], ['overtime', 'overtime'], ['travel', 'travel'], ['purchase', 'purchaseSimple']]) {
    const html = readFileSync(resolve(root, `forms/${page}_request_form.html`), 'utf8');
    assert.ok(html.includes(`data-signoff="${slot}"`), page);
    assert.ok(html.indexOf('signoff-store.js') > 0 && html.indexOf('signoff-store.js') < html.indexOf(`forms/${page}_request_form.js`), page);
  }
});

test('saving trims names, drops blank boxes and keeps other forms; reset restores defaults', () => {
  const { api } = setup();
  api.save('leave', ['老闆']);
  assert.deepEqual(plain(api.save('payment', [' 申請人 ', '', '老闆', '   ', '', ''])), ['老闆', '申請人']);
  assert.deepEqual(plain(api.get('payment')), ['老闆', '申請人']);
  assert.equal(api.isCustom('payment'), true);
  assert.deepEqual(plain(api.get('leave')), ['老闆']);
  api.reset('payment');
  assert.equal(api.isCustom('payment'), false);
  assert.equal(api.get('payment').length, 6);
  assert.deepEqual(plain(api.get('leave')), ['老闆']);
});

test('all default layouts place approvers on the left and the originator on the far right', () => {
  const { api } = setup();
  api.FORMS.forEach(form => {
    const names = api.get(form.id);
    assert.match(names[0], /^(總經理|部門主管|核決主管|核准)$/u, form.id);
    assert.match(names.at(-1), /^(製單|製單人|申請人)$/u, form.id);
    assert.deepEqual(plain(names), plain(form.defaults), form.id);
  });
  const html = readFileSync(resolve(root, 'forms/leave_request_form.html'), 'utf8');
  const bookstore = html.slice(html.indexOf('id="bookstoreSheet"'), html.indexOf('id="pvSheet"'));
  assert.ok(bookstore.includes('data-signoff="leave"'));
});

test('saved and imported common titles use descending seniority without changing equal-level custom order', () => {
  const { api } = setup(JSON.stringify({ travel: ['申請人', '代理人', '部門主管', '人資', '會計', '總經理'] }));
  assert.deepEqual(plain(api.get('travel')), ['總經理', '部門主管', '人資', '會計', '代理人', '申請人']);
  assert.deepEqual(plain(api.save('payment', ['製單人', '出納', '會計', '覆核', '經理', '總經理'])), ['總經理', '經理', '覆核', '會計', '出納', '製單人']);
  assert.deepEqual(plain(api.validate({ outing: ['申請人', '自訂乙', '自訂甲', '部門主管'] }).outing), ['部門主管', '自訂乙', '自訂甲', '申請人']);
});

test('legacy supply and acceptance defaults acquire a rightmost originator while custom labels remain intact', () => {
  const { api } = setup(JSON.stringify({ supply: ['領用人', '部門主管', '保管人', '發放人'], acceptance: ['驗收人', '採購', '保管人', '部門主管', '會計'] }));
  assert.equal(api.get('supply').at(-1), '申請人');
  assert.equal(api.get('acceptance').at(-1), '製單人');
  assert.deepEqual(plain(api.save('supply', ['自訂欄位', '申請人'])), ['自訂欄位', '申請人']);
});

test('invalid settings are refused without changing what is stored', () => {
  const { api, storage } = setup();
  api.save('travel', ['申請人']);
  const before = storage.get(api.KEY);
  assert.throws(() => api.save('travel', ['', ' ']), /至少/);
  assert.throws(() => api.save('travel', Array(7).fill('主管')), /1–6/);
  assert.throws(() => api.save('travel', ['這個名稱超過十個字的上限']), /1–10/);
  assert.throws(() => api.save('unknown', ['主管']), /不支援/);
  assert.throws(() => api.validate({ unknown: ['主管'] }), /不支援/);
  assert.throws(() => api.validate({ leave: [] }));
  assert.throws(() => api.validate([]));
  assert.equal(storage.get(api.KEY), before);
});

test('damaged storage falls back to defaults so forms can still print', () => {
  for (const bad of ['{broken', '[]', '{"leave":[]}', '{"unknown":["甲"]}']) {
    const { api } = setup(bad);
    assert.equal(api.get('leave').length, 6, bad);
    assert.equal(api.isCustom('leave'), false, bad);
  }
});

test('merge keeps local settings and adds only forms not yet customised', () => {
  const { api } = setup();
  assert.deepEqual(plain(api.merge({ leave: ['本機'] }, { leave: ['匯入'], travel: ['匯入'] })), { leave: ['本機'], travel: ['匯入'] });
});
