const crypto = require('node:crypto');

const TTL = 30 * 60 * 1000;
const MAX_BYTES = 32 * 1024 * 1024;
const validEmail = (value) => typeof value === 'string' && value.length <= 254
    && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(value);
const fail = (status, message) => Object.assign(new Error(message), { status });

// Short-lived capabilities allow only server-produced attachments, one recipient
// per design, and bounded retries. No arbitrary email subject/body/URLs accepted.
function createEmailService({ env = process.env, fetcher = fetch, now = Date.now } = {}) {
    const entries = new Map();
    const configured = () => Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
    const prune = () => {
        for (const [key, entry] of entries) if (entry.expires <= now()) entries.delete(key);
    };
    const timer = setInterval(prune, 60000);
    timer.unref();
    function register(result) {
        if (!configured()) return { available: false };
        prune();
        const attachments = [];
        if (result.pdf) attachments.push({ filename: 'Saerbridge-report.pdf', content: result.pdf });
        if (result.spreadsheet) attachments.push({ filename: 'Saerbridge-costs.csv', content: result.spreadsheet });
        if (result.projectPlan) attachments.push({ filename: 'Saerbridge-plan.json', content: Buffer.from(JSON.stringify(result.projectPlan, null, 2)).toString('base64') });
        if (result.image && /^[A-Za-z0-9+/=]+$/.test(result.image)) attachments.push({ filename: 'Saerbridge-design.png', content: result.image });
        const bytes = attachments.reduce((sum, file) => sum + file.content.length, 0);
        if (!attachments.length || bytes > 12 * 1024 * 1024) return { available: false };
        let total = [...entries.values()].reduce((sum, item) => sum + item.bytes, 0);
        while (entries.size && (total + bytes > MAX_BYTES || entries.size >= 100)) {
            const key = entries.keys().next().value;
            total -= entries.get(key).bytes;
            entries.delete(key);
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expires = now() + TTL;
        entries.set(token, { attachments, bytes, expires, attempts: 0, recipient: null, sent: false, busy: false });
        return { available: true, token, expiresAt: new Date(expires).toISOString(), files: attachments.map((file) => file.filename) };
    }
    async function send({ token, email, consent } = {}) {
        if (!configured()) throw fail(503, 'Email delivery is not configured yet. Download your files instead.');
        if (consent !== true || !validEmail(email) || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
            throw fail(400, 'Enter one valid email address and confirm permission to send.');
        }
        prune();
        const entry = entries.get(token);
        if (!entry) throw fail(410, 'This email link has expired. Download your files or generate a new design.');
        if (entry.recipient && entry.recipient !== email) throw fail(409, 'This design is already assigned to an email address.');
        if (entry.sent) return { accepted: true };
        if (entry.busy) throw fail(409, 'Your email is being submitted. Please wait.');
        if (entry.attempts >= 3) throw fail(429, 'Email retry limit reached. Download your files instead.');
        entry.recipient = email;
        entry.busy = true;
        entry.attempts += 1;
        try {
            const response = await fetcher('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `saerbridge-${token}` },
                signal: AbortSignal.timeout(20000),
                body: JSON.stringify({
                    from: env.EMAIL_FROM, to: [email], subject: 'Your Saerbridge Source design',
                    text: 'Your generated Saerbridge Source files are attached. These are preliminary planning estimates, not construction approval. Check the report assumptions and obtain professional review before building. You requested this one-time email in the app.',
                    attachments: entry.attachments,
                }),
            });
            if (!response.ok) throw new Error('Provider rejected request');
            const data = await response.json();
            if (!data.id) throw new Error('Missing provider receipt');
            entry.sent = true;
            entry.attachments = [];
            entry.bytes = 0;
            return { accepted: true };
        } catch {
            throw fail(502, 'Email could not be confirmed. Retry with the same address, or download your files.');
        } finally { entry.busy = false; }
    }
    return { register, send, close: () => clearInterval(timer) };
}

module.exports = { createEmailService, validEmail };
