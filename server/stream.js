// Heartbeats keep long NDJSON responses active while generation is quiet.
function startDesignStream(res, intervalMs = 15000) {
    const send = (event) => {
        if (!res.destroyed && !res.writableEnded) {
            res.write(JSON.stringify(event) + '\n');
        }
    };
    const timer = setInterval(() => {
        if (!res.writableNeedDrain) send({ type: 'heartbeat' });
    }, intervalMs);
    timer.unref();
    const stop = () => {
        clearInterval(timer);
        res.off('close', stop);
        res.off('finish', stop);
    };
    res.once('close', stop);
    res.once('finish', stop);
    const sendResult = async (result) => {
        // No heartbeat may split the final NDJSON record. Flush large images in
        // bounded chunks, waiting for each write before closing the response.
        stop();
        const payload = Buffer.from(JSON.stringify({ type: 'result', ...result }) + '\n');
        for (let offset = 0; offset < payload.length; offset += 65536) {
            if (res.destroyed || res.writableEnded) throw new Error('Design connection closed before delivery.');
            await new Promise((resolve, reject) => {
                res.write(payload.subarray(offset, offset + 65536), error => error ? reject(error) : resolve());
            });
        }
    };
    return { send, sendResult, stop };
}

module.exports = { startDesignStream };
