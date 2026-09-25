import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

test('production manifest icons and precache files exist', () => {
    const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest'));
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
    for (const icon of manifest.icons) {
        const bytes = readFileSync(`dist${icon.src}`);
        const size = Number(icon.sizes.split('x')[0]);
        assert.equal(bytes.readUInt32BE(16), size);
        assert.equal(bytes.readUInt32BE(20), size);
    }
    const sw = readFileSync('dist/sw.js', 'utf8');
    assert.ok(!sw.includes('__PRECACHE__'));
    const files = JSON.parse(sw.match(/const ASSETS = (.+);/)[1]);
    assert.ok(files.includes('/index.html'));
    for (const file of files) {
        assert.ok(existsSync(`dist${file}`), file);
        assert.ok(!file.startsWith('/api/') && !file.includes('_headers') && !file.endsWith('.env'));
    }
});

test('service worker leaves APIs private and serves shell when offline', async () => {
    const listeners = {};
    let requests = 0;
    const shell = { offline: true };
    const context = {
        URL,
        self: { location: { origin: 'https://source.example' }, addEventListener: (name, callback) => { listeners[name] = callback; } },
        caches: { open: async () => ({ match: async (url) => url === '/index.html' ? shell : null }) },
        fetch: async () => { requests++; throw Error('offline'); },
    };
    vm.runInNewContext(readFileSync('dist/sw.js', 'utf8'), context);
    for (const request of [
        { url: 'https://source.example/api/home-design', method: 'GET' },
        { url: 'https://source.example/api/email-design', method: 'POST' },
        { url: 'https://backend.example/api/health', method: 'GET' },
    ]) listeners.fetch({ request, respondWith: () => assert.fail('API must bypass cache') });
    assert.equal(requests, 0);
    let response;
    listeners.fetch({ request: { url: 'https://source.example/', method: 'GET', mode: 'navigate' }, respondWith: (value) => { response = value; } });
    assert.equal(await response, shell);
});
