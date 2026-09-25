const assert = require('node:assert/strict');
const crypto = require('crypto');
const test = require('node:test');
const { createApp } = require('../app');
const { designGuidanceDto, supplierResearchDto } = require('./aiPayload');
const {
    decryptEnvelope,
    encryptEnvelope,
    publicKeyInfo,
    resetKeysForTests,
} = require('./envelope');
const { originAllowed, productionApiOriginAllowed, shouldRedirectToHttps } = require('./httpPolicy');
const { redact } = require('./redact');

test('AES-GCM hides plaintext and rejects tampering or the wrong key', async () => {
    resetKeysForTests();
    delete process.env.DATA_ENCRYPTION_PRIVATE_KEY;
    const secret = '12 Secret Street, budget 250000';
    const envelope = encryptEnvelope({ notes: secret, widthM: 10 });
    const packed = Buffer.from(envelope.ciphertext, 'base64');
    assert.equal(packed.includes(Buffer.from(secret)), false);
    assert.deepEqual(decryptEnvelope(envelope), { notes: secret, widthM: 10 });

    const tampered = { ...envelope, ciphertext: Buffer.from(packed.map((byte, index) => (index === 0 ? byte ^ 1 : byte))).toString('base64') };
    assert.throws(() => decryptEnvelope(tampered), /secure payload/);

    const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const foreign = encryptEnvelope({ notes: secret }, other.publicKey);
    foreign.keyId = envelope.keyId;
    assert.throws(() => decryptEnvelope(foreign), /secure payload/);
});

test('a browser Web Crypto envelope decrypts on the server', async () => {
    resetKeysForTests();
    const info = publicKeyInfo();
    const subtle = crypto.webcrypto.subtle;
    const publicKey = await subtle.importKey(
        'spki',
        Buffer.from(info.publicKey, 'base64'),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt'],
    );
    const aes = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
    const rawKey = await subtle.exportKey('raw', aes);
    const encryptedKey = await subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawKey);
    const iv = crypto.webcrypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await subtle.encrypt(
        { name: 'AES-GCM', iv },
        aes,
        new TextEncoder().encode(JSON.stringify({ desiredFloorAreaM2: 36 })),
    );
    const envelope = {
        version: 1,
        algorithm: info.algorithm,
        keyId: info.keyId,
        encryptedKey: Buffer.from(encryptedKey).toString('base64'),
        iv: Buffer.from(iv).toString('base64'),
        ciphertext: Buffer.from(ciphertext).toString('base64'),
    };
    assert.deepEqual(decryptEnvelope(envelope), { desiredFloorAreaM2: 36 });
    assert.equal(JSON.stringify(publicKeyInfo()).includes('PRIVATE KEY'), false);
});

test('logs and model payloads drop secrets and precise location', () => {
    const logged = redact('failed sk-testkeyvalue12345678 at -26.204100,28.047300 Bearer abc.def');
    assert.equal(logged.includes('sk-test'), false);
    assert.equal(logged.includes('-26.204100'), false);
    assert.equal(logged.includes('abc.def'), false);

    const guidance = designGuidanceDto({
        materials: [{ type: 'concrete-block', label: 'Concrete block' }],
        furniture: [],
        property: { widthM: 10, lengthM: 15, desiredFloorAreaM2: 36, notes: '12 Secret Street' },
        area: 'Soweto, -26.204100',
        residence: 'house',
    });
    assert.equal(JSON.stringify(guidance).includes('Secret'), false);
    assert.equal(JSON.stringify(guidance).includes('-26.204100'), false);
    assert.equal(guidance.desiredDwellingAreaM2, 36);

    const research = supplierResearchDto({
        area: 'Soweto',
        materials: [{ type: 'timber', label: 'Timber', budget: 50000 }],
    });
    assert.equal(Object.hasOwn(research.materials[0], 'budget'), false);
});

test('production transport policy and private routes', async () => {
    assert.equal(productionApiOriginAllowed('http://example.com', true), false);
    assert.equal(productionApiOriginAllowed('https://example.com', true), true);
    assert.equal(originAllowed('https://app.example', { ALLOWED_ORIGINS: 'https://app.example', NODE_ENV: 'production' }), true);
    assert.equal(originAllowed('https://evil.example', { ALLOWED_ORIGINS: 'https://app.example', NODE_ENV: 'production' }), false);
    assert.equal(originAllowed('http://localhost:5173', { NODE_ENV: 'production' }), false);
    assert.equal(shouldRedirectToHttps({ headers: { 'x-forwarded-proto': 'http' }, secure: false }, { NODE_ENV: 'production' }), true);
    assert.equal(shouldRedirectToHttps({ headers: { 'x-forwarded-proto': 'https' }, secure: false }, { NODE_ENV: 'production' }), false);

    const app = createApp();
    const server = app.listen(0);
    const port = server.address().port;
    try {
        const files = await fetch(`http://127.0.0.1:${port}/files/plan.pdf`);
        const project = await fetch(`http://127.0.0.1:${port}/api/projects/11111111-1111-1111-1111-111111111111`);
        const plain = await fetch(`http://127.0.0.1:${port}/api/home-design`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ materials: [{ type: 'timber', label: 'Timber' }], furniture: [] }),
        });
        const plainBody = await plain.json();
        assert.equal(files.status, 404);
        assert.equal(project.status, 404);
        assert.equal(plain.status, 400);
        assert.equal(plainBody.error, 'The secure payload could not be read.');
        assert.equal(JSON.stringify(plainBody).includes('timber'), false);
    } finally {
        server.close();
    }
});
