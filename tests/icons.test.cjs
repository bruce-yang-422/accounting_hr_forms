const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const pages = ['index.html', 'guide.html', 'favorites.html', '404.html', 'offline.html', 'forms/leave_request_form.html', 'forms/payment_request_form.html'];
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
  });
});

test('home form icons use vector assets and SVG assets are available offline', () => {
  const home = read('index.html');
  for (const path of ['assets/icons/leave-calendar-approval.svg', 'assets/icons/payment-money-bag-invoice.svg']) {
    assert.ok(home.includes(path));
    assert.match(read(path), /<svg[^>]+viewBox="0 0 64 64"/);
  }
  const worker = read('service-worker.js');
  for (const path of ['assets/icons/brand.svg', 'assets/icons/ui.svg', 'assets/css/icons.css', 'assets/icons/leave-calendar-approval.svg', 'assets/icons/payment-money-bag-invoice.svg']) assert.ok(worker.includes(`"${path}"`), path);
});

test('functional arrow and checkbox glyphs are rendered with SVG rather than text', () => {
  for (const path of ['forms/leave_request_form.html', 'forms/payment_request_form.html']) {
    const html = read(path);
    assert.equal(/[□⌂⋯]/u.test(html), false, path);
    assert.match(html, /href="#icon-printer"/);
    assert.match(html, /href="#icon-checkbox"/);
    assert.match(html, /href="#icon-more"/);
  }
  assert.equal(/content:\s*['"][→▾]/u.test(read('assets/css/index.css') + read('assets/css/styles.css')), false);
});
