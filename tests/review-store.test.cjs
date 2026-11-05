const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const source = readFileSync(resolve(root, 'assets/js/signoff-store.js'), 'utf8');
function setup(initial) {
  const storage = new Map(initial === undefined ? [] : [['hr_form_reviews', initial]]);
  const context = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
  vm.createContext(context); vm.runInContext(source + '\nthis.api = ReviewStore; this.forms = SignoffStore.FORMS;', context);
  return { api: context.api, forms: context.forms, storage };
}
const plain = value => JSON.parse(JSON.stringify(value));

test('every form has defaults, including the approve or return choice where it applied before', () => {
  const { api, forms } = setup();
  forms.forEach(form => assert.ok(api.get(form.id).length >= 2, form.id));
  assert.deepEqual(plain(api.get('travel')[0]), { name: '核決主管', options: ['同意', '退回'] });
  assert.deepEqual(plain(api.get('payment')[1].options), ['應稅', '免稅', '零稅率']);
  assert.equal(api.get('leave')[1].options.length, 0);
  assert.equal(api.titleOf('leave'), '核決主管審核');
  assert.equal(api.titleOf('payment'), '審核 · 確認');
  for (const page of ['leave', 'payment', 'overtime', 'travel', 'purchase']) {
    assert.match(readFileSync(resolve(root, `forms/${page}_request_form.html`), 'utf8'), /data-review="/, page);
  }
});

test('saving splits choices on common separators, and drops blank items', () => {
  const { api } = setup();
  const saved = api.save('leave', [
    { name: ' 老闆 ', options: '同意、退回, 再議，待補 ' }, { name: '', options: '' }, { name: '備註', options: '' },
  ]);
  assert.deepEqual(plain(saved), [{ name: '老闆', options: ['同意', '退回', '再議', '待補'] }, { name: '備註', options: [] }]);
  assert.equal(api.isCustom('leave'), true);
  api.reset('leave');
  assert.equal(api.isCustom('leave'), false);
});

test('all blank is a saved choice that hides the section, separately from reset', () => {
  const { api } = setup();
  api.save('travel', [{ name: '', options: '' }]);
  assert.equal(api.get('travel').length, 0);
  assert.equal(api.isCustom('travel'), true);
  api.reset('travel');
  assert.equal(api.get('travel').length, 3);
});

test('invalid input is refused without changing what is stored', () => {
  const { api, storage } = setup();
  api.save('travel', [{ name: '主管', options: '' }]);
  const before = storage.get(api.KEY);
  assert.throws(() => api.save('travel', [{ name: '', options: '同意' }]), /沒有名稱/);
  assert.throws(() => api.save('travel', [{ name: '這個名稱超過十個字的上限', options: '' }]), /1–10/);
  assert.throws(() => api.save('travel', [{ name: '主管', options: '一、二、三、四、五' }]), /最多 4/);
  assert.throws(() => api.save('travel', [{ name: '主管', options: '這個選項太長了' }]), /1–6/);
  assert.throws(() => api.save('unknown', []), /不支援/);
  assert.throws(() => api.validate({ leave: [{ name: '甲', options: 'x' }] }));
  assert.throws(() => api.validate({ leave: Array(7).fill({ name: '甲', options: [] }) }), /最多 6/);
  assert.equal(storage.get(api.KEY), before);
});

test('damaged storage falls back to defaults, and merge keeps local choices', () => {
  for (const bad of ['{broken', '[]', '{"unknown":[]}']) assert.equal(setup(bad).api.get('leave').length, 3, bad);
  const { api } = setup();
  const local = [{ name: '本機', options: [] }];
  assert.deepEqual(plain(api.merge({ leave: local }, { leave: [], travel: [] })), { leave: local, travel: [] });
});
