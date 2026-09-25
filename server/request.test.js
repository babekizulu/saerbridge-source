const assert = require('node:assert/strict');
const test = require('node:test');
const { parseHomeDesignBody } = require('./request');
const { imageModels } = require('./design');

const timber = { type: 'timber', label: 'Timber' };
const sofa = { type: 'sofa', label: 'Sofa' };

function design(extra = {}) {
    return {
        materials: [timber],
        furniture: [sofa],
        ...extra,
    };
}

test('accepts a design without property measurements', () => {
    const parsed = parseHomeDesignBody(design());
    assert.equal(parsed.property, undefined);
    assert.deepEqual(parsed.materials, [timber]);
});

test('keeps only type and label', () => {
    const parsed = parseHomeDesignBody({
        materials: [{ type: 'glass', label: 'Glass', id: 'x', rowBreak: true }],
        furniture: [],
    });
    assert.deepEqual(parsed.materials, [{ type: 'glass', label: 'Glass' }]);
});

test('rejects absent arrays, empty designs, and more than 48 items', () => {
    assert.throws(() => parseHomeDesignBody({}), /materials must be an array/);
    assert.throws(() => parseHomeDesignBody({ materials: [], furniture: [] }), /at least one/);
    const materials = Array.from({ length: 49 }, () => timber);
    assert.throws(() => parseHomeDesignBody({ materials, furniture: [] }), /48/);
});

test('rejects malformed items', () => {
    assert.throws(() => parseHomeDesignBody({
        materials: [{ type: 'Timber', label: 'Timber' }],
        furniture: [],
    }), /valid type and label/);
});

test('accepts decimals, partial dimensions, and notes', () => {
    const parsed = parseHomeDesignBody(design({
        property: { widthM: 8.5, notes: '  Street access from the south.  ' },
    }));
    assert.deepEqual(parsed.property, {
        widthM: 8.5,
        notes: 'Street access from the south.',
    });
});

test('accepts width and length with a desired floor area', () => {
    const parsed = parseHomeDesignBody(design({
        property: { widthM: 8, lengthM: 12, desiredFloorAreaM2: 72 },
    }));
    assert.deepEqual(parsed.property, {
        widthM: 8,
        lengthM: 12,
        desiredFloorAreaM2: 72,
    });
});

test('rejects zero, negative, non-numeric, infinite, and oversized measurements', () => {
    for (const property of [
        { widthM: 0 },
        { lengthM: -4 },
        { widthM: '8' },
        { desiredFloorAreaM2: Number.NaN },
        { widthM: Number.POSITIVE_INFINITY },
        { lengthM: 900 },
        { desiredFloorAreaM2: 500000 },
        { widthM: 8.255 },
        { notes: 'x'.repeat(281) },
        [],
    ]) {
        assert.throws(() => parseHomeDesignBody(design({ property })), /Property measurements are not valid/);
    }
});

test('rejects a desired floor area far beyond the stated plot', () => {
    assert.throws(() => parseHomeDesignBody(design({
        property: { widthM: 8, lengthM: 12, desiredFloorAreaM2: 20000 },
    })), /Property measurements are not valid/);
});

test('allows an empty selection when a photograph workflow permits it', () => {
    const parsed = parseHomeDesignBody({ materials: [], furniture: [] }, { allowEmpty: true });
    assert.deepEqual(parsed.materials, []);
    assert.equal(parsed.location, undefined);
});

test('reads a manual area and coarse coordinates', () => {
    const parsed = parseHomeDesignBody(design({
        location: { area: '  Soweto, Johannesburg, Gauteng  ', latitude: -26.248, longitude: 27.854 },
    }));
    assert.equal(parsed.location.area, 'Soweto, Johannesburg, Gauteng');
    assert.equal(parsed.location.latitude, -26.25);
    assert.equal(parsed.location.longitude, 27.85);
});

test('rejects invalid locations and html in the area', () => {
    assert.throws(() => parseHomeDesignBody(design({
        location: { latitude: 120, longitude: 10 },
    })), /Location is not valid/);
    assert.throws(() => parseHomeDesignBody(design({
        location: { area: 'x'.repeat(121) },
    })), /Location is not valid/);
    const parsed = parseHomeDesignBody(design({
        location: { area: 'New Brighton <b>Gqeberha</b>' },
    }));
    assert.equal(parsed.location.area.includes('<'), false);
});

test('reads a chosen residence type and rejects an unknown one', () => {
    const parsed = parseHomeDesignBody(design({ residence: 'informal-settlement' }));
    assert.equal(parsed.residence, 'informal-settlement');
    assert.equal(parseHomeDesignBody(design({ residence: 'apartment' })).residence, 'apartment');
    assert.equal(parseHomeDesignBody(design({ residence: 'condo' })).residence, 'condo');
    assert.equal(parseHomeDesignBody(design({ residence: 'house' })).residence, 'house');
    assert.equal(parseHomeDesignBody(design()).residence, undefined);
    assert.throws(() => parseHomeDesignBody(design({ residence: 'shack' })), /Residence type is not valid/);
});

test('image fallback order starts with gpt-image-2 and omits dall-e', () => {
    assert.deepEqual(imageModels({}), [
        'gpt-image-2',
        'gpt-image-2.5-sunburst',
        'gpt-image-1.5',
        'gpt-image-1',
    ]);
    assert.deepEqual(imageModels({ OPENAI_IMAGE_MODEL: 'gpt-image-1' }), [
        'gpt-image-1',
        'gpt-image-2',
        'gpt-image-2.5-sunburst',
        'gpt-image-1.5',
    ]);
});
