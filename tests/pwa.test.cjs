const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const vm = require('node:vm');
const root = resolve(__dirname, '..');
const source = readFileSync(resolve(root, 'service-worker.js'), 'utf8');
const version = JSON.parse(source.match(/const VERSION = (.*);/)[1]);
const resources = JSON.parse(source.match(/const PRECACHE = ([\s\S]*?);/)[1]);

function worker({ failInstall = false, legacy = false, modern = false } = {}) {
  const scope = 'https://example.test/project/';
  const handlers = {};
  const stores = new Map();
  let skipped = false, claimed = false;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async addAll(requests) {
          for (const request of requests) {
            const path = decodeURIComponent(new URL(request.url).pathname.slice('/project/'.length));
            store.set(request.url, new Response(readFileSync(resolve(root, path))));
            if (failInstall) throw new Error('interrupted download');
          }
        },
        async match(key) { return store.get(typeof key === 'string' ? key : key.url)?.clone(); },
        async put(key, response) { store.set(key, response); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(key) { return stores.delete(key); },
  };
  const context = { URL, Request, Response, MessageChannel, setTimeout, clearTimeout, caches, fetch: async () => { throw new Error('offline'); }, self: {
    registration: { scope, active: legacy || modern ? { postMessage(data, ports) { ports[0].postMessage(modern ? { version: 'previous' } : {}); } } : null }, clients: { async claim() { claimed = true; } },
    skipWaiting() { skipped = true; }, addEventListener: (name, handler) => { handlers[name] = handler; },
  } };
  vm.runInNewContext(source, context);
  async function lifecycle(name) {
    let pending;
    handlers[name]({ waitUntil(promise) { pending = promise; } });
    await pending;
  }
  async function request(path, mode = 'navigate', method = 'GET') {
    let pending;
    handlers.fetch({ request: { url: new URL(path, scope).href, method, mode }, respondWith(promise) { pending = promise; } });
    return pending;
  }
  async function message(data, ports = []) {
    let pending;
    handlers.message({ data, ports, waitUntil(promise) { pending = promise; } });
    await pending;
  }
  return { stores, caches, lifecycle, request, message, scope, skipped: () => skipped, claimed: () => claimed };
}

test('manifest, icons, precache and build hash match the current source', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.scope, './'); assert.equal(manifest.start_url, './'); assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const data = readFileSync(resolve(root, icon.src));
    assert.equal(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`, icon.sizes);
  }
  const hash = createHash('sha256').update(readFileSync(resolve(root, 'scripts/service-worker.template.js')));
  resources.forEach(path => {
    assert.ok(existsSync(resolve(root, path)), path);
    hash.update(path).update('\0').update(readFileSync(resolve(root, path)));
  });
  assert.equal(hash.digest('hex').slice(0, 16), version, 'Run python scripts/build_pwa.py after changing cached files');
  assert.equal(new Set(resources).size, resources.length);
  for (const page of ['index.html', 'guide.html', 'favorites.html', 'forms/leave_request_form.html', 'forms/payment_request_form.html', 'forms/overtime_request_form.html', 'forms/travel_request_form.html', 'forms/purchase_request_form.html', 'forms/receipt_form.html', 'forms/simple_receipt_form.html']) {
    const html = readFileSync(resolve(root, page), 'utf8');
    assert.match(html, /rel="manifest"/); assert.match(html, /assets\/js\/pwa\.js/);
    assert.ok(resources.includes(page));
  }
});

test('successful installation caches the full shell and does not interrupt open forms', async () => {
  const sw = worker(); await sw.lifecycle('install');
  assert.equal(sw.skipped(), false);
  assert.equal(sw.stores.size, 1);
  assert.equal([...sw.stores.values()][0].size, resources.length);
  const home = await sw.request('./?installed=1'); assert.match(await home.text(), /表單填寫中心/);
  const payment = await sw.request('forms/payment_request_form.html'); assert.match(await payment.text(), /paymentNote/);
  const script = await sw.request('assets/js/payee-store.js', 'cors'); assert.match(await script.text(), /PayeeStore/);
});

test('interrupted installation rolls back its partial cache', async () => {
  const sw = worker({ failInstall: true });
  await assert.rejects(sw.lifecycle('install'), /interrupted/);
  assert.equal(sw.stores.size, 0);
});

test('worker exposes a version and activates when explicitly requested', async () => {
  const sw = worker(); await sw.lifecycle('install');
  let reply;
  await sw.message({ type: 'GET_VERSION' }, [{ postMessage(data) { reply = data; } }]);
  assert.equal(reply.version, version);
  assert.equal(sw.skipped(), false);
  await sw.message({ type: 'ACTIVATE_UPDATE' });
  assert.equal(sw.skipped(), true);
});

test('legacy workers can migrate without requiring every old tab to close', async () => {
  const sw = worker({ legacy: true }); await sw.lifecycle('install');
  assert.equal(sw.skipped(), true);
});

test('workers supporting the update protocol continue waiting for user action', async () => {
  const sw = worker({ modern: true }); await sw.lifecycle('install');
  assert.equal(sw.skipped(), false);
});

test('activation removes only this app scope caches and claims clients', async () => {
  const sw = worker(); await sw.lifecycle('install');
  await sw.caches.open(`office-forms:${sw.scope}:old-version`);
  await sw.caches.open('another-app-cache');
  await sw.caches.open('office-forms:https://example.test/:old-version');
  await sw.lifecycle('activate');
  assert.equal(sw.claimed(), true);
  assert.equal(sw.stores.size, 3);
  assert.ok(sw.stores.has('another-app-cache'));
  assert.ok(!sw.stores.has(`office-forms:${sw.scope}:old-version`));
});

test('unknown offline routes show an actionable fallback; other origins and POST are untouched', async () => {
  const sw = worker(); await sw.lifecycle('install');
  const fallback = await sw.request('unknown/nested/page');
  assert.equal(fallback.status, 503);
  const html = await fallback.text();
  assert.ok(html.includes(`<base href="${sw.scope}">`)); assert.match(html, /離線模式/);
  assert.equal(await sw.request('https://other.example/'), undefined);
  assert.equal(await sw.request('https://example.test/outside/'), undefined);
  assert.equal(await sw.request('index.html', 'cors', 'POST'), undefined);
});
