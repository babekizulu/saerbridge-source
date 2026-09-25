const assert = require('node:assert/strict');
const test = require('node:test');
const sharp = require('sharp');
const { assertRaster, sanitizePhotograph } = require('./imageInput');

async function sample(format, width = 32, height = 24) {
    const image = sharp({
        create: {
            width,
            height,
            channels: 3,
            background: { r: 200, g: 180, b: 140 },
        },
    });
    if (format === 'jpeg') return image.jpeg().toBuffer();
    if (format === 'png') return image.png().toBuffer();
    return image.webp().toBuffer();
}

test('accepts jpeg, png, and webp and re-encodes them', async () => {
    for (const format of ['jpeg', 'png', 'webp']) {
        const input = await sample(format);
        const output = await sanitizePhotograph(input);
        assert.equal(output.mimeType, 'image/jpeg');
        assert.equal(output.buffer[0], 0xff);
        assert.equal(output.buffer[1], 0xd8);
    }
});

test('re-encoding drops location text carried in the photograph', async () => {
    const jpeg = await sample('jpeg');
    const comment = Buffer.from('GPSLatitude 26.2041 GPSLongitude 28.0473');
    const length = Buffer.alloc(2);
    length.writeUInt16BE(comment.length + 2);
    const marked = Buffer.concat([
        jpeg.subarray(0, 2),
        Buffer.from([0xff, 0xfe]),
        length,
        comment,
        jpeg.subarray(2),
    ]);
    const output = await sanitizePhotograph(marked);
    assert.equal(output.buffer.includes(Buffer.from('GPSLatitude')), false);
});

test('rejects spoofed, unsupported, corrupt, and oversized images', async () => {
    const text = Buffer.from('not an image');
    assert.throws(() => assertRaster(text), /JPEG, PNG, or WebP/);
    const fakePng = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from('<html></html>')]);
    await assert.rejects(() => sanitizePhotograph(fakePng), /could not be read|JPEG, PNG, or WebP/);
    const huge = Buffer.alloc(8 * 1024 * 1024 + 1, 1);
    huge[0] = 0xff;
    huge[1] = 0xd8;
    huge[2] = 0xff;
    await assert.rejects(() => sanitizePhotograph(huge), /too large/);
    const wide = await sample('jpeg', 4100, 8);
    await assert.rejects(() => sanitizePhotograph(wide), /too large/);
});
