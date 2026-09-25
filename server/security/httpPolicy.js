function allowedOrigins(env = process.env) {
    const configured = String(env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    if (configured.length) return configured;
    if (env.NODE_ENV === 'production') return [];
    return [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
    ];
}

function originAllowed(origin, env = process.env) {
    if (!origin) return true;
    return allowedOrigins(env).includes(origin);
}

function shouldRedirectToHttps(req, env = process.env) {
    if (env.NODE_ENV !== 'production') return false;
    const forwarded = req.headers?.['x-forwarded-proto'];
    if (forwarded === 'https' || req.secure) return false;
    return true;
}

function productionApiOriginAllowed(origin, isProduction) {
    if (!isProduction) return true;
    if (!origin) return true;
    return origin.startsWith('https://');
}

module.exports = {
    allowedOrigins,
    originAllowed,
    shouldRedirectToHttps,
    productionApiOriginAllowed,
};
