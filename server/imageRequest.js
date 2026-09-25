// One bounded image operation; SDK retries must not multiply its deadline.
const IMAGE_BUDGET_MS = 360000;

function imageQuality(env = process.env) {
    return ['low', 'medium', 'high', 'auto'].includes(env.OPENAI_IMAGE_QUALITY)
        ? env.OPENAI_IMAGE_QUALITY : 'medium';
}

function transientImageError(error) {
    return error.name === 'APIConnectionTimeoutError'
        || error.name === 'APIConnectionError'
        || error.name === 'TimeoutError'
        || error.code === 'ETIMEDOUT'
        || (error.status >= 500 && error.status <= 599);
}

async function requestImage({ models, request, shouldTryNextModel, onError, env = process.env, now = Date.now }) {
    const configured = Number(env.OPENAI_IMAGE_TIMEOUT_MS);
    const attemptMs = Number.isFinite(configured) && configured >= 30000 && configured <= 240000
        ? configured : 180000;
    const deadline = now() + IMAGE_BUDGET_MS;
    let lastError;
    for (const model of models) {
        const timeout = Math.min(attemptMs, deadline - now());
        if (timeout <= 0) break;
        const signal = AbortSignal.timeout(timeout);
        try {
            return await request(model, { timeout, maxRetries: 0, signal });
        } catch (error) {
            lastError = error;
            onError(model, error);
            // Authentication, quota and safety failures must not be retried on another model.
            if (error.status === 401 || error.status === 429 || error.code === 'content_policy_violation') break;
            if (!signal.aborted && !transientImageError(error) && !shouldTryNextModel(error)) break;
        }
    }
    throw lastError || new Error('Image generation exceeded its time budget.');
}

module.exports = { requestImage, imageQuality };
