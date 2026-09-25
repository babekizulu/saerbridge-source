export type Envelope = {
    version: number;
    algorithm: string;
    keyId: string;
    encryptedKey: string;
    iv: string;
    ciphertext: string;
};

type PublicKeyInfo = {
    version: number;
    algorithm: string;
    keyId: string;
    publicKey: string;
};

let cached: PublicKeyInfo | null = null;

function bytesToBase64(bytes: Uint8Array) {
    let binary = '';
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
    }
    return btoa(binary);
}

function base64ToBytes(value: string) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

export function productionApiOriginAllowed(origin: string, isProduction: boolean) {
    if (!isProduction) return true;
    if (!origin) return true;
    return origin.startsWith('https://');
}

async function publicKey(apiOrigin: string) {
    if (cached) return cached;
    const response = await fetch(`${apiOrigin}/api/crypto/public-key`, { cache: 'no-store' });
    if (!response.ok) throw new Error('The design server could not start a secure session.');
    const info = await response.json() as PublicKeyInfo;
    if (info.algorithm !== 'RSA-OAEP-256+AES-256-GCM' || !info.publicKey || !info.keyId) {
        throw new Error('The design server could not start a secure session.');
    }
    cached = info;
    return info;
}

export function clearPublicKeyCache() {
    cached = null;
}

export async function sealPayload(apiOrigin: string, payload: object): Promise<Envelope> {
    const info = await publicKey(apiOrigin);
    const key = await crypto.subtle.importKey(
        'spki',
        base64ToBytes(info.publicKey),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt'],
    );
    const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
    const rawKey = await crypto.subtle.exportKey('raw', aes);
    const encryptedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, rawKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aes,
        new TextEncoder().encode(JSON.stringify(payload)),
    );
    return {
        version: info.version,
        algorithm: info.algorithm,
        keyId: info.keyId,
        encryptedKey: bytesToBase64(new Uint8Array(encryptedKey)),
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    };
}
