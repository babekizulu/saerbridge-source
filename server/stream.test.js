const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { startDesignStream } = require('./stream');

test('quiet streams receive heartbeats and timers stop on disconnect', (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const res = new EventEmitter();
    const writes = [];
    res.write = chunk => writes.push(JSON.parse(chunk));
    const stream = startDesignStream(res, 10);
    t.mock.timers.tick(10);
    assert.deepEqual(writes, [{ type: 'heartbeat' }]);
    res.destroyed = true;
    res.emit('close');
    t.mock.timers.tick(100);
    stream.send({ type: 'result' });
    assert.equal(writes.length, 1);
    assert.equal(res.listenerCount('finish'), 0);
});

test('finished streams stop heartbeats and reject further writes', (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const res = new EventEmitter();
    const writes = [];
    res.write = chunk => writes.push(JSON.parse(chunk));
    const stream = startDesignStream(res, 10);
    stream.send({ type: 'result', image: 'example' });
    res.writableEnded = true;
    res.emit('finish');
    t.mock.timers.tick(100);
    stream.send({ type: 'heartbeat' });
    assert.equal(writes.length, 1);
    assert.equal(res.listenerCount('close'), 0);
});

test('heartbeats respect response backpressure', (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const res = new EventEmitter();
    let writes = 0;
    res.write = () => writes++;
    res.writableNeedDrain = true;
    const stream = startDesignStream(res, 10);
    t.mock.timers.tick(10);
    assert.equal(writes, 0);
    res.writableNeedDrain = false;
    t.mock.timers.tick(10);
    assert.equal(writes, 1);
    stream.stop();
});

test('a large final image is flushed intact with no heartbeat inside the record', async (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] });
    const res = new EventEmitter();
    const writes = [];
    let pending = 0;
    res.write = (chunk, callback) => {
        assert.equal(pending, 0, 'writes must wait for the previous flush');
        pending++;
        writes.push(Buffer.from(chunk));
        t.mock.timers.tick(50);
        setImmediate(() => { pending--; callback(); });
        return false;
    };
    const image = 'a'.repeat(400000);
    await startDesignStream(res, 10).sendResult({ image, caption: '36 m²' });
    assert.ok(writes.length > 1);
    assert.ok(writes.every(chunk => chunk.length <= 65536));
    assert.deepEqual(JSON.parse(Buffer.concat(writes).toString()), { type: 'result', image, caption: '36 m²' });
    assert.equal(res.listenerCount('close'), 0);
});

test('a failed final-result write rejects without continuing to send', async () => {
    const res = new EventEmitter();
    let writes = 0;
    res.write = (_chunk, callback) => { writes++; callback(new Error('connection reset')); };
    await assert.rejects(startDesignStream(res).sendResult({ image: 'a'.repeat(200000) }), /connection reset/);
    assert.equal(writes, 1);
});
