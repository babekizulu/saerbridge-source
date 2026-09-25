const crypto = require('crypto');
const { createEmailService } = require('./email');
const cors = require('cors');
const express = require('express');
const multer = require('multer');
const { sanitizePhotograph } = require('./imageInput');
const { createProject } = require('./orchestrate');
const { parseHomeDesignBody } = require('./request');
const { startDesignStream } = require('./stream');
const { decryptEnvelope, publicKeyInfo } = require('./security/envelope');
const { allowedOrigins, shouldRedirectToHttps } = require('./security/httpPolicy');
const { logError } = require('./security/redact');

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 8;
const hits = new Map();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

function rateLimit(req, res, next) {
    const now = Date.now();
    const key = req.ip || 'local';
    const recent = (hits.get(key) || []).filter((time) => now - time < WINDOW_MS);
    if (recent.length >= MAX_REQUESTS) {
        return res.status(429).json({ error: 'Please wait before generating another design.' });
    }
    recent.push(now);
    hits.set(key, recent);
    return next();
}

function acceptUpload(req, res, next) {
    const type = req.headers['content-type'] || '';
    if (!type.includes('multipart/form-data')) return next();
    return upload.single('image')(req, res, (error) => {
        if (!error) return next();
        const message = error.code === 'LIMIT_FILE_SIZE'
            ? 'The photograph is too large. Use an image under 8 MB.'
            : 'The photograph could not be read.';
        return res.status(400).json({ error: message });
    });
}

function securityHeaders(_req, res, next) {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Frame-Options', 'DENY');
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    res.set('Cache-Control', 'private, no-store');
    if (process.env.NODE_ENV === 'production') {
        res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    next();
}

function httpsRedirect(req, res, next) {
    // Railway probes readiness over its internal HTTP network.
    if (req.path === '/api/health') return next();
    if (!shouldRedirectToHttps(req)) return next();
    const host = req.headers.host;
    if (!host) return res.status(400).json({ error: 'The design could not be generated.' });
    return res.redirect(308, `https://${host}${req.originalUrl}`);
}

function readEnvelope(body) {
    const envelope = typeof body?.envelope === 'string' ? JSON.parse(body.envelope) : body?.envelope;
    return decryptEnvelope(envelope);
}

function createApp() {
    const app = express();
    const emailService = createEmailService();
    if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
    app.disable('x-powered-by');
    app.use(httpsRedirect);
    app.use(cors({
        origin(origin, callback) {
            const allowed = allowedOrigins();
            if (!origin || allowed.includes(origin)) return callback(null, true);
            return callback(null, false);
        },
    }));
    app.use(securityHeaders);
    app.use(express.json({ limit: '1mb' }));

    app.get('/api/health', (_req, res) => {
        res.json({ ok: true });
    });

    app.post('/api/email-design', rateLimit, async (req, res) => {
        try { return res.json(await emailService.send(req.body)); }
        catch (error) { return res.status(error.status || 500).json({ error: error.message || 'Email could not be sent.' }); }
    });

    app.get('/api/crypto/public-key', (_req, res) => {
        const info = publicKeyInfo();
        res.json({
            version: info.version,
            algorithm: info.algorithm,
            keyId: info.keyId,
            publicKey: info.publicKey,
        });
    });

    app.post('/api/home-design', rateLimit, acceptUpload, async (req, res) => {
        const requestId = crypto.randomUUID();
        const started = Date.now();
        res.set('X-Request-Id', requestId);
        res.on('close', () => {
            if (!res.writableFinished) logError({
                requestId,
                stage: 'connection',
                message: 'Client disconnected before completion',
                durationMs: Date.now() - started,
            });
        });
        try {
            let photograph;
            if (req.file) {
                if (req.body?.consent !== 'true') {
                    return res.status(400).json({
                        error: 'Photograph permission is required before it can be processed.',
                    });
                }
                photograph = await sanitizePhotograph(req.file.buffer);
            }
            const parsed = parseHomeDesignBody(readEnvelope(req.body), { allowEmpty: Boolean(photograph) });
            const wantsStream = `${req.headers.accept || ''}`.includes('application/x-ndjson');
            if (wantsStream) {
                res.status(200);
                res.set('Content-Type', 'application/x-ndjson; charset=utf-8');
                res.set('Cache-Control', 'private, no-store');
                res.flushHeaders();
                const stream = startDesignStream(res);
                try {
                    const result = await createProject({
                        ...parsed,
                        photograph,
                        requestId,
                        onProgress: (event) => {
                            stream.send({ type: 'progress', ...event });
                        },
                    });
                    result.emailDelivery = emailService.register(result);
                    await stream.sendResult(result);
                } catch (error) {
                    const status = error.status === 400 ? 400 : 500;
                    if (status === 500) {
                        logError({
                            requestId,
                            stage: error.stage || 'request',
                            causeCode: error.cause?.cause?.code || error.cause?.code,
                            message: error.error?.message || error.message || 'Home design failed',
                        });
                    }
                    stream.send({
                        type: 'error',
                        error: status === 400 ? error.message : 'The design could not be generated.',
                    });
                } finally {
                    stream.stop();
                }
                if (!res.destroyed && !res.writableEnded) res.end();
                return undefined;
            }
            const result = await createProject({
                ...parsed,
                photograph,
                requestId,
            });
            result.emailDelivery = emailService.register(result);
            return res.json(result);
        } catch (error) {
            const status = error.status === 400 ? 400 : 500;
            if (status === 500) {
                logError({
                    requestId,
                    stage: error.stage || 'request',
                    causeCode: error.cause?.cause?.code || error.cause?.code,
                    message: error.error?.message || error.message || 'Home design failed',
                });
            }
            if (error instanceof SyntaxError) {
                return res.status(400).json({ error: 'The secure payload could not be read.' });
            }
            return res.status(status).json({
                error: status === 400 ? error.message : 'The design could not be generated.',
            });
        }
    });

    return app;
}

module.exports = { createApp };
