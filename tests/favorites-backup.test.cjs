const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const source = readFileSync(resolve(__dirname, '../assets/js/form-templates.js'), 'utf8') + '\n' + readFileSync(resolve(__dirname, '../assets/js/signoff-store.js'), 'utf8') + '\n' + readFileSync(resolve(__dirname, '../assets/js/favorites-backup.js'), 'utf8');

function setup(initial = {}, failKey = '') {
  const storage = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  let failed = false;
  const context = {
    window: { dispatchEvent() {} }, Event: class {}, structuredClone,
    crypto: { randomUUID }, localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem(key, value) {
        if (key === failKey && !failed) { failed = true; throw new Error('Storage full'); }
        storage.set(key, value);
      },
      removeItem: key => storage.delete(key),
    },
  };
  vm.runInNewContext(source, context);
  const api = context.window.FavoritesBackup;
  return { api, storage, plain: value => JSON.parse(JSON.stringify(value)) };
}

const profile = (id, name, department = '行政部') => ({ id, name, department, agent: '代理人', contactPhone: '0912345678', jobTitle: '專員' });
const payee = (id, name) => ({ id, payee: name, payeeType: 'company', payMethod: 'transfer', taxId: '12345678', bankName: '測試銀行', bankBranch: '測試分行', bankAccount: '00123456' });
const envelope = datasets => JSON.stringify({ format: 'accounting-hr-favorites', version: 1, datasets });

test('export and replace round trip preserves all fields and default, and excludes drafts', () => {
  const initial = { yijia_profiles: { profiles: [profile('p_a', '王小明')], defaultId: 'p_a' },
    yijia_payee_favorites: [payee('r_a', '常用公司')], hr_form_drafts_leave: [{ id: 'draft' }] };
  const { api } = setup(initial);
  const exported = api.createExport();
  assert.deepEqual(Object.keys(exported.datasets), ['profiles', 'payees', 'templates', 'signoffs', 'reviews']);
  const target = setup();
  target.api.importData(target.api.parse(JSON.stringify(exported)), 'replace');
  assert.deepEqual(JSON.parse(target.storage.get('yijia_profiles')), initial.yijia_profiles);
  assert.deepEqual(JSON.parse(target.storage.get('yijia_payee_favorites')), initial.yijia_payee_favorites);
});

test('merge keeps local conflicts/default, handles ID collisions, and is idempotent', () => {
  const { api, storage } = setup({ yijia_profiles: { profiles: [profile('p_a', '現有人員')], defaultId: 'p_a' },
    yijia_payee_favorites: [payee('r_a', '現有公司')] });
  const incoming = api.parse(envelope({ profiles: { profiles: [profile('p_remote', '現有人員'), profile('p_a', '新人員')], defaultId: 'p_a' },
    payees: [{ ...payee('r_remote', '現有公司'), bankName: '其他銀行' }, payee('r_a', '新公司')] }));
  api.importData(incoming, 'merge'); api.importData(incoming, 'merge');
  const profiles = JSON.parse(storage.get('yijia_profiles'));
  const payees = JSON.parse(storage.get('yijia_payee_favorites'));
  assert.equal(profiles.profiles.length, 2); assert.equal(profiles.defaultId, 'p_a');
  assert.notEqual(profiles.profiles[1].id, 'p_a');
  assert.equal(payees.length, 2); assert.equal(payees[0].bankName, '測試銀行');
  assert.notEqual(payees[1].id, 'r_a');
});

test('merge into an empty browser adopts incoming default', () => {
  const { api, storage } = setup();
  api.importData(api.parse(envelope({ profiles: { profiles: [profile('p_a', '甲'), profile('p_b', '乙')], defaultId: 'p_b' } })), 'merge');
  assert.equal(JSON.parse(storage.get('yijia_profiles')).defaultId, 'p_b');
});

test('partial replace and empty datasets only clear included categories', () => {
  const { api, storage } = setup({ yijia_profiles: { profiles: [profile('p_a', '甲')], defaultId: 'p_a' },
    yijia_payee_favorites: [payee('r_a', '公司')] });
  const before = storage.get('yijia_profiles');
  api.importData(api.parse(envelope({ payees: [] })), 'replace');
  assert.equal(storage.get('yijia_profiles'), before);
  assert.equal(storage.get('yijia_payee_favorites'), '[]');
});

test('rejects malformed, unknown, unsafe and inconsistent imports without writes', () => {
  const { api, storage } = setup();
  const invalid = ['{', '{}', JSON.stringify({ format: 'accounting-hr-favorites', version: 2, datasets: { payees: [] } }),
    envelope({ unknown: [] }), envelope({ profiles: { profiles: [], defaultId: 'missing' } }),
    envelope({ profiles: { profiles: [profile('x" onclick="bad', '甲')], defaultId: null } }),
    envelope({ payees: [payee('a', '公司'), payee('a', '其他公司')] }),
    envelope({ payees: [{ ...payee('a', '公司'), payMethod: 'invalid' }] }),
    envelope({ payees: [{ ...payee('a', '公司'), bankAccount: '' }] }),
    envelope({ profiles: { profiles: [{ ...profile('a', '甲'), agent: {} }], defaultId: null } })];
  invalid.forEach(value => assert.throws(() => api.parse(value)));
  assert.equal(storage.size, 0);
});

test('validates all categories before writing and rolls back a later storage failure', () => {
  const initial = { yijia_profiles: { profiles: [profile('old', '原有人員')], defaultId: 'old' }, yijia_payee_favorites: [] };
  const { api, storage } = setup(initial, 'yijia_payee_favorites');
  const before = [...storage.entries()];
  const valid = api.parse(envelope({ profiles: { profiles: [profile('new', '新資料')], defaultId: 'new' }, payees: [payee('r', '公司')] }));
  assert.throws(() => api.importData(valid, 'replace'), /已保留原有資料/);
  assert.deepEqual([...storage.entries()], before);
  valid.payees[0].payMethod = 'invalid';
  assert.throws(() => api.importData(valid, 'replace'));
  assert.deepEqual([...storage.entries()], before);
});

test('future registered categories participate in export, preview and import', () => {
  const { api, storage } = setup();
  api.registerDataset('futureForm', { key: 'future_favorites', label: '新表單', empty: [],
    validate(value) { if (!Array.isArray(value)) throw new Error('invalid'); return value; },
    merge: (current, incoming) => [...new Set([...current, ...incoming])], count: value => value.length });
  assert.ok(Object.hasOwn(api.createExport().datasets, 'futureForm'));
  const incoming = api.parse('\uFEFF' + envelope({ futureForm: ['範本'] }));
  assert.equal(api.describe(incoming), '新表單：1 筆');
  api.importData(incoming, 'merge');
  assert.equal(storage.get('future_favorites'), '["範本"]');
});

test('template backup round trip retains fixed content, excludes transaction fields and preserves omitted datasets', () => {
  const record = { id: 't_a', title: '每月雲端費', createdAt: '', updatedAt: '', data: { reason: '雲端服務', amtGross: '1000', docNo: 'OLD', reqDate: '2020-01-01' } };
  const origin = setup({ hr_form_templates: { payment: [record], leave: [] } });
  const exported = origin.api.createExport();
  assert.equal(exported.datasets.templates.payment[0].data.reason, '雲端服務');
  assert.equal(Object.hasOwn(exported.datasets.templates.payment[0].data, 'docNo'), false);
  const target = setup(); target.api.importData(target.api.parse(JSON.stringify(exported)), 'replace');
  assert.equal(JSON.parse(target.storage.get('hr_form_templates')).payment[0].title, '每月雲端費');
  const before = target.storage.get('hr_form_templates');
  target.api.importData(target.api.parse(envelope({ payees: [] })), 'replace');
  assert.equal(target.storage.get('hr_form_templates'), before);
});

test('backup round trip carries sign-off settings, and merge keeps local choices', () => {
  const origin = setup({ hr_form_signoffs: { leave: ['申請人', '老闆'], travel: ['主管'] } });
  const exported = origin.api.createExport();
  const target = setup({ hr_form_signoffs: { leave: ['本機'] } });
  target.api.importData(target.api.parse(JSON.stringify(exported)), 'merge');
  assert.deepEqual(JSON.parse(target.storage.get('hr_form_signoffs')), { leave: ['本機'], travel: ['主管'] });
  target.api.importData(target.api.parse(JSON.stringify(exported)), 'replace');
  assert.deepEqual(JSON.parse(target.storage.get('hr_form_signoffs')).leave, ['申請人', '老闆']);
  assert.throws(() => target.api.parse(envelope({ signoffs: { leave: Array(7).fill('甲') } })));
});

test('backup round trip carries review settings, including a hidden section', () => {
  const origin = setup({ hr_form_reviews: { leave: [], travel: [{ name: '老闆', options: ['同意'] }] } });
  const target = setup();
  target.api.importData(target.api.parse(JSON.stringify(origin.api.createExport())), 'replace');
  assert.deepEqual(JSON.parse(target.storage.get('hr_form_reviews')), { leave: [], travel: [{ name: '老闆', options: ['同意'] }] });
});

test('backup round trip includes overtime, travel and purchase templates', () => {
  const record = (id, data) => ({ id, title: id, createdAt: '', updatedAt: '', data });
  const origin = setup({ hr_form_templates: { overtime: [record('t_o', { reason: '加班', docNo: 'OLD' })], travel: [record('t_t', { transportModes: ['hsr'] })], purchase: [record('t_p', { item1Name: '紙' })] } });
  const exported = origin.api.createExport();
  const target = setup(); target.api.importData(target.api.parse(JSON.stringify(exported)), 'replace');
  const saved = JSON.parse(target.storage.get('hr_form_templates'));
  assert.deepEqual(saved.overtime[0].data, { reason: '加班' });
  assert.deepEqual(saved.travel[0].data.transportModes, ['hsr']);
  assert.equal(saved.purchase[0].data.item1Name, '紙');
});
