const MAX_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 4096;
const MAX_PIXELS = 16_000_000;

const SIGNATURES = [
    { format: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
    { format: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
    { format: 'webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

function invalid(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function matchesSignature(buffer) {
    return SIGNATURES.some((signature) => (
        buffer.length > signature.bytes.length
        && signature.bytes.every((byte, index) => buffer[index] === byte)
    ));
}

function isWebp(buffer) {
    return buffer.length > 12
        && buffer.toString('ascii', 0, 4) === 'RIFF'
        && buffer.toString('ascii', 8, 12) === 'WEBP';
}

function assertRaster(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw invalid('The photograph could not be read.');
    }
    if (buffer.length > MAX_BYTES) {
        throw invalid('The photograph is too large. Use an image under 8 MB.');
    }
    const png = buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG';
    const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const webp = isWebp(buffer);
    if (!png && !jpeg && !webp) {
        throw invalid('Use a JPEG, PNG, or WebP photograph.');
    }
    if (!matchesSignature(buffer)) {
        throw invalid('Use a JPEG, PNG, or WebP photograph.');
    }
}

async function sanitizePhotograph(buffer) {
    assertRaster(buffer);
    let sharp;
    try {
        sharp = require('sharp');
    } catch {
        throw invalid('Photograph processing is unavailable.');
    }

    let image;
    try {
        image = sharp(buffer, {
            failOn: 'error',
            limitInputPixels: MAX_PIXELS,
            sequentialRead: true,
        });
        const metadata = await image.metadata();
        const format = metadata.format;
        if (!['jpeg', 'png', 'webp'].includes(format)) {
            throw invalid('Use a JPEG, PNG, or WebP photograph.');
        }
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        if (!width || !height || width > MAX_EDGE || height > MAX_EDGE) {
            throw invalid('The photograph dimensions are too large.');
        }
        if (width * height > MAX_PIXELS) {
            throw invalid('The photograph has too many pixels.');
        }
        const output = await image
            .rotate()
            .resize({
                width: 1536,
                height: 1536,
                fit: 'inside',
                withoutEnlargement: true,
            })
            .jpeg({ quality: 82, mozjpeg: true })
            .toBuffer();
        return { buffer: output, mimeType: 'image/jpeg' };
    } catch (error) {
        if (error.status === 400) throw error;
        throw invalid('The photograph could not be read.');
    }
}

module.exports = {
    MAX_BYTES,
    assertRaster,
    sanitizePhotograph,
};
