function redact(value) {
    return String(value ?? '')
        .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[redacted-key]')
        .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[redacted-key]')
        .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
        .replace(/-?\d{1,3}\.\d{4,}/g, '[redacted-coordinate]');
}

function logError(fields) {
    const safe = {};
    Object.entries(fields).forEach(([key, value]) => {
        safe[key] = typeof value === 'number' ? value : redact(value);
    });
    console.error(JSON.stringify(safe));
}

module.exports = { redact, logError };
