const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const pages = ['index.html', 'guide.html', 'favorites.html', '404.html', 'offline.html', 'forms/leave_request_form.html', 'forms/payment_request_form.html', 'forms/overtime_request_form.html', 'forms/travel_request_form.html', 'forms/purchase_request_form.html', 'forms/receipt_form.html', 'forms/simple_receipt_form.html', 'forms/expense_certificate_form.html', 'forms/outing_request_form.html', 'forms/petty_cash_request_form.html', 'forms/supply_requisition_form.html', 'forms/purchase_acceptance_form.html'];
const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/u;
const read = path => readFileSync(resolve(root, path), 'utf8');

test('every page embeds the same original SVG library and resolves all icon references', () => {
  const source = read('assets/icons/ui.svg');
  const symbols = [...source.matchAll(/<symbol\b[\s\S]*?<\/symbol>/g)].map(match => match[0]);
  const ids = new Set(symbols.map(symbol => symbol.match(/id="([^"]+)"/)[1]));
  assert.equal(ids.size, symbols.length);
  assert.ok(symbols.length >= 20);
  pages.forEach(path => {
    const html = read(path);
    assert.equal(emoji.test(html), false, `${path}: do not use emoji icons`);
    symbols.forEach(symbol => assert.ok(html.includes(symbol), `${path}: rebuild SVG symbols`));
    for (const match of html.matchAll(/<use href="#([^"]+)"/g)) assert.ok(ids.has(match[1]), `${path}: ${match[1]}`);
    assert.match(html, /assets\/css\/icons\.css/);
    assert.match(html, /rel="icon"[^>]*assets\/icons\/brand\.svg/);
    assert.match(html, /<img[^>]*assets\/icons\/brand\.svg/);
  });
});

test('form identity artwork is used on its pages and works offline', () => {
  const art = {
    'index.html': ['leave-calendar-document.svg', 'payment-banknote-document.svg', 'overtime-clock-plus.svg', 'travel-plane-suitcase.svg', 'purchase-cart-document.svg', 'receipt-itemized-stamp.svg', 'simple-receipt-signature-check.svg', 'expense-certificate-coins-shield.svg', 'outing-map-pin-document.svg', 'petty-cash-box-document.svg', 'supply-boxes-handover.svg', 'purchase-acceptance-clipboard-box.svg'],
    'favorites.html': ['profile-folder-sync.svg'],
  };
  const worker = read('service-worker.js');
  for (const [page, names] of Object.entries(art)) {
    const html = read(page);
    names.forEach(name => {
      const path = `assets/icons/${name}`;
      assert.ok(html.includes(path), path);
      assert.ok(worker.includes(`"${path}"`), path);
      assert.ok(readFileSync(resolve(root, path)).length > 0, path);
    });
  }
  for (const path of ['assets/icons/brand.svg', 'assets/icons/ui.svg', 'assets/css/icons.css']) assert.ok(worker.includes(`"${path}"`), path);
});

test('every form card has its own identity icon', () => {
  const icons = [...read('index.html').matchAll(/fc-icon--image[^>]*>\s*<img src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(icons.length, 12);
  assert.equal(new Set(icons).size, icons.length);
});

test('functional arrow and checkbox glyphs are rendered with SVG rather than text', () => {
  for (const path of ['forms/leave_request_form.html', 'forms/payment_request_form.html', 'forms/overtime_request_form.html', 'forms/travel_request_form.html', 'forms/purchase_request_form.html', 'forms/receipt_form.html', 'forms/simple_receipt_form.html', 'forms/expense_certificate_form.html']) {
    const html = read(path);
    assert.equal(/[□⌂⋯]/u.test(html), false, path);
    assert.match(html, /href="#icon-printer"/);
    assert.match(html, /href="#icon-more"/);
  }
  assert.match(read('assets/js/signoff-store.js'), /#icon-checkbox/);
  assert.equal(/content:\s*['"][→▾]/u.test(read('assets/css/index.css') + read('assets/css/styles.css')), false);
});
