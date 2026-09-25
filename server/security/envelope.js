const crypto = require('crypto');

const VERSION = 1;
const ALGORITHM = 'RSA-OAEP-256+AES-256-GCM';

let pair;

function bad() {
    const error = new Error('The secure payload could not be read.');
    error.status = 400;
    return error;
}

function loadPair() {
    const pem = process.env.DATA_ENCRYPTION_PRIVATE_KEY;
    if (typeof pem === 'string' && pem.includes('BEGIN PRIVATE KEY')) {
        const privateKey = crypto.createPrivateKey(pem);
        return {
            privateKey,
            publicKey: crypto.createPublicKey(privateKey),
            source: 'env',
        };
    }
    const generated = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicExponent: 0x10001,
    });
    return { ...generated, source: 'ephemeral' };
}

function keys() {
    if (!pair) pair = loadPair();
    return pair;
}

function resetKeysForTests() {
    pair = null;
}

function publicKeyInfo() {
    const der = keys().publicKey.export({ type: 'spki', format: 'der' });
    return {
        version: VERSION,
        algorithm: ALGORITHM,
        keyId: crypto.createHash('sha256').update(der).digest('hex').slice(0, 16),
        publicKey: der.toString('base64'),
        source: keys().source,
    };
}

function encryptEnvelope(payload, publicKey = keys().publicKey) {
    const info = publicKeyInfo();
    const rawKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', rawKey, iv);
    const data = Buffer.concat([
        cipher.update(JSON.stringify(payload), 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const encryptedKey = crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
    }, rawKey);
    rawKey.fill(0);
    return {
        version: VERSION,
        algorithm: ALGORITHM,
        keyId: info.keyId,
        encryptedKey: encryptedKey.toString('base64'),
        iv: iv.toString('base64'),
        ciphertext: Buffer.concat([data, tag]).toString('base64'),
    };
}

function decryptEnvelope(envelope) {
    if (!envelope || typeof envelope !== 'object') throw bad();
    if (envelope.version !== VERSION || envelope.algorithm !== ALGORITHM) throw bad();
    if (envelope.keyId !== publicKeyInfo().keyId) throw bad();
    let rawKey;
    try {
        rawKey = crypto.privateDecrypt({
            key: keys().privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        }, Buffer.from(envelope.encryptedKey, 'base64'));
        const iv = Buffer.from(envelope.iv, 'base64');
        const packed = Buffer.from(envelope.ciphertext, 'base64');
        if (rawKey.length !== 32 || iv.length !== 12 || packed.length < 17) throw bad();
        const tag = packed.subarray(packed.length - 16);
        const data = packed.subarray(0, packed.length - 16);
        const decipher = crypto.createDecipheriv('aes-256-gcm', rawKey, iv);
        decipher.setAuthTag(tag);
        const plain = Buffer.concat([decipher.update(data), decipher.final()]);
        return JSON.parse(plain.toString('utf8'));
    } catch (error) {
        if (error.status === 400) throw error;
        throw bad();
    } finally {
        if (rawKey) rawKey.fill(0);
    }
}

module.exports = {
    VERSION,
    ALGORITHM,
    publicKeyInfo,
    encryptEnvelope,
    decryptEnvelope,
    resetKeysForTests,
};
