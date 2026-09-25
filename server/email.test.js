const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createEmailService, validEmail } = require('./email');
const env = { RESEND_API_KEY: 'test-only', EMAIL_FROM: 'Source <test@example.com>' };
const result = { pdf: Buffer.from('pdf').toString('base64'), spreadsheet: Buffer.from('csv').toString('base64') };
test('email is unavailable until configured; rejects invalid recipients', async () => {
    const service = createEmailService({ env: {} });
    assert.equal(service.register(result).available, false);
    await assert.rejects(service.send({}), { status: 503 });
    for (const email of ['a@b.com\r\nBcc:other@example.com', 'a@b.com,c@d.com', '', null]) assert.equal(validEmail(email), false);
    service.close();
});
test('only registered artifacts are sent, one recipient, retries deduplicated', async () => {
    const calls = [];
    const service = createEmailService({ env, fetcher: async (...args) => { calls.push(args); return { ok: true, json: async () => ({ id: 'receipt' }) }; } });
    const delivery = service.register(result);
    const input = { token: delivery.token, email: 'owner@example.com', consent: true, attachments: ['untrusted'] };
    await assert.rejects(service.send({ ...input, consent: false }), { status: 400 });
    await service.send(input); await service.send(input);
    assert.equal(calls.length, 1);
    const sent = JSON.parse(calls[0][1].body);
    assert.deepEqual(sent.attachments.map((item) => item.content), [result.pdf, result.spreadsheet]);
    assert.equal(calls[0][1].headers['Idempotency-Key'], `saerbridge-${delivery.token}`);
    await assert.rejects(service.send({ ...input, email: 'other@example.com' }), { status: 409 });
    service.close();
});
test('expired and forged capabilities cannot send', async () => {
    let time = Date.now();
    const service = createEmailService({ env, now: () => time, fetcher: () => { throw Error('must not call'); } });
    const delivery = service.register(result);
    time += 31 * 60 * 1000;
    await assert.rejects(service.send({ token: delivery.token, email: 'a@example.com', consent: true }), { status: 410 });
    await assert.rejects(service.send({ token: 'a'.repeat(64), email: 'a@example.com', consent: true }), { status: 410 });
    service.close();
});
test('provider errors are redacted, retries bounded and concurrent sends blocked', async () => {
    let release;
    const service = createEmailService({ env, fetcher: () => new Promise((resolve) => { release = () => resolve({ ok: false }); }) });
    const delivery = service.register(result);
    const input = { token: delivery.token, email: 'a@example.com', consent: true };
    const pending = service.send(input);
    await assert.rejects(service.send(input), { status: 409 });
    release(); await assert.rejects(pending, { status: 502 });
    for (let i = 0; i < 2; i++) { const retry = service.send(input); release(); await assert.rejects(retry, { status: 502 }); }
    await assert.rejects(service.send(input), { status: 429 });
    service.close();
});
