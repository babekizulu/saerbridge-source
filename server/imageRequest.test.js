const test = require('node:test');
const assert = require('node:assert/strict');
const { requestImage, imageQuality } = require('./imageRequest');

const defaults = { models: ['primary', 'fallback', 'third'], shouldTryNextModel: () => false, onError: () => {}, env: {} };

test('an image timeout falls back without hidden SDK retries', async () => {
    const calls = [];
    const result = await requestImage({ ...defaults, request: async (model, options) => {
        calls.push(model);
        assert.equal(options.maxRetries, 0);
        assert.equal(options.timeout, 180000);
        assert.equal(options.signal.aborted, false);
        if (model === 'primary') throw Object.assign(new Error('Request timed out.'), { name: 'APIConnectionTimeoutError' });
        return 'image-data';
    }, now: () => 0 });
    assert.equal(result, 'image-data');
    assert.deepEqual(calls, ['primary', 'fallback']);
});

test('the shared deadline prevents a third slow generation attempt', async () => {
    let elapsed = 0;
    let calls = 0;
    await assert.rejects(requestImage({ ...defaults, now: () => elapsed, request: async (_model, options) => {
        calls++;
        elapsed += options.timeout;
        throw Object.assign(new Error('timeout'), { name: 'APIConnectionTimeoutError' });
    } }), /timeout/);
    assert.equal(calls, 2);
    assert.equal(elapsed, 360000);
});

test('a fallback gets only the remaining operation budget', async () => {
    let elapsed = 0;
    const timeouts = [];
    await requestImage({ ...defaults, env: { OPENAI_IMAGE_TIMEOUT_MS: '240000' }, now: () => elapsed,
        request: async (_model, options) => {
            timeouts.push(options.timeout);
            if (timeouts.length === 1) {
                elapsed = 240000;
                throw Object.assign(new Error('unavailable'), { status: 503 });
            }
            return 'image-data';
        } });
    assert.deepEqual(timeouts, [240000, 120000]);
});

test('authentication, quota, refusal and invalid requests do not cycle models', async () => {
    for (const fields of [{ status: 401 }, { status: 429 }, { status: 400, code: 'content_policy_violation' }, { status: 400 }]) {
        let calls = 0;
        await assert.rejects(requestImage({ ...defaults, request: async () => {
            calls++;
            throw Object.assign(new Error('rejected'), fields);
        } }), /rejected/);
        assert.equal(calls, 1);
    }
});

test('model availability errors retain the existing fallback behavior', async () => {
    const calls = [];
    const result = await requestImage({ ...defaults, shouldTryNextModel: error => error.status === 404,
        request: async model => {
            calls.push(model);
            if (model === 'primary') throw Object.assign(new Error('model unavailable'), { status: 404 });
            return 'image-data';
        } });
    assert.equal(result, 'image-data');
    assert.equal(calls.length, 2);
});

test('preview quality defaults to medium and allows explicit high quality', () => {
    assert.equal(imageQuality({}), 'medium');
    assert.equal(imageQuality({ OPENAI_IMAGE_QUALITY: 'high' }), 'high');
    assert.equal(imageQuality({ OPENAI_IMAGE_QUALITY: 'invalid' }), 'medium');
});
