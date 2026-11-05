const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync, readdirSync } = require('node:fs');
const { resolve, join } = require('node:path');
const root = resolve(__dirname, '..');
const scripts = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? scripts(path) : entry.name.endsWith('.js') ? [path] : [];
});

// Most form scripts need a browser to run, so a typo would otherwise pass every other test.
test('every browser script parses', () => {
  const files = scripts(resolve(root, 'assets/js'));
  assert.ok(files.length > 10);
  files.forEach(file => assert.doesNotThrow(() => new vm.Script(readFileSync(file, 'utf8'), { filename: file }), file));
});
