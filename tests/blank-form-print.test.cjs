const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const source = readFileSync(resolve(root, 'assets/js/blank-form-print.js'), 'utf8');

function setup() {
  const listeners = {};
  let current, saves = 0, prints = 0, builds = 0, validations = 0;
  const parent = { append(node) { current = node; } };
  function sheet(textContent = '') {
    const classes = new Set(['pv-sheet']);
    return {
      textContent, className: 'pv-sheet', hidden: false, parentNode: parent, clientHeight: 500, scrollHeight: 500,
      classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) },
      cloneNode() { return sheet(this.textContent); }, querySelectorAll: () => [], querySelector: () => null,
      remove() { if (current === this) current = null; },
    };
  }
  const original = sheet();
  const fill = { style: {}, dispatchEvent() {} };
  const preview = { style: {}, querySelectorAll: () => [original] };
  const notice = {};
  const window = {
    buildPreview() { builds += 1; original.textContent = 'private transaction'; },
    goToPreview() { validations += 1; }, validateForm: () => ['required'],
    printRecord() { saves += 1; window.print(); },
    print() { prints += 1; listeners.beforeprint?.(); }, scrollTo() {},
    addEventListener: (name, callback) => { listeners[name] = callback; },
  };
  const document = {
    getElementById: id => ({ fillPage: fill, previewPage: preview, pvOverflow: notice })[id],
    addEventListener() {},
  };
  const context = { window, document, Event: class {} };
  vm.runInNewContext(source, context);
  return { window, fill, preview, original, current: () => current,
    counts: () => ({ saves, prints, builds, validations }) };
}

test('blank preview bypasses required fields and uses the original empty skeleton without clearing user data', () => {
  const app = setup();
  app.original.textContent = 'old preview data';
  app.window.BlankFormPrint.setEnabled(true); app.window.goToPreview();
  assert.equal(app.current().textContent, '');
  assert.equal(app.original.textContent, 'private transaction');
  assert.equal(app.preview.style.display, 'block');
  assert.equal(app.window.validateForm().length, 0);
  assert.equal(app.counts().validations, 0);
});

test('blank printing never saves a completion and beforeprint cannot leak filled preview data', () => {
  const app = setup(); app.window.BlankFormPrint.setEnabled(true); app.window.goToPreview();
  app.original.textContent = 'sensitive filled values'; app.window.printRecord();
  assert.equal(app.current().textContent, '');
  assert.equal(app.counts().saves, 0); assert.equal(app.counts().prints, 1);
});

test('turning blank mode off restores ordinary validation, preview and completion recording', () => {
  const app = setup(); app.window.BlankFormPrint.setEnabled(true); app.window.goToPreview();
  app.window.BlankFormPrint.setEnabled(false);
  assert.equal(app.current(), null);
  assert.equal(app.original.classList.contains('blank-print-original'), false);
  assert.equal(app.window.validateForm()[0], 'required');
  app.window.goToPreview(); app.window.printRecord();
  assert.equal(app.counts().validations, 1); assert.equal(app.counts().saves, 1);
});

test('every form installs blank printing after its renderer and before desktop controls', () => {
  for (const name of readdirSync(resolve(root, 'forms')).filter(name => name.endsWith('_form.html'))) {
    const html = readFileSync(resolve(root, 'forms', name), 'utf8');
    const index = html.indexOf('assets/js/blank-form-print.js');
    assert.ok(index > html.indexOf(`assets/js/forms/${name.replace('.html', '.js')}`), name);
    assert.ok(index < html.indexOf('assets/js/form-desktop.js'), name);
  }
});
