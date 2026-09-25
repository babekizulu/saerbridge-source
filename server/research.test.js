const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeSuppliers, readJson } = require('./research');

function supplier(extra = {}) {
    return {
        name: 'Cashbuild Diepkloof',
        address: 'Shop 01, Diepkloof Square',
        suburb: 'Diepkloof',
        city: 'Johannesburg',
        materialCategories: ['Cement'],
        offers: [{
            materialType: 'cement',
            productName: 'Cement 50kg',
            unit: 'bag',
            priceZAR: 99,
            priceType: 'listed-current',
        }],
        sourceUrl: 'https://www.cashbuild.co.za/store',
        confidence: 'high',
        ...extra,
    };
}

test('keeps a sourced listed price and rejects a missing or invented url', () => {
    const kept = normalizeSuppliers({ suppliers: [supplier()] }, ['www.cashbuild.co.za']);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].offers[0].priceZAR, 99);
    assert.equal(kept[0].offers[0].priceType, 'listed-current');

    const rejected = normalizeSuppliers({
        suppliers: [
            supplier({ sourceUrl: '' }),
            supplier({ name: 'Nowhere', sourceUrl: 'https://example.com/store' }),
            supplier({ name: 'Script', sourceUrl: 'javascript:alert(1)' }),
            { name: 'Broken' },
        ],
    });
    assert.equal(rejected.length, 0);
});

test('turns a price without a usable figure into quote-required', () => {
    const kept = normalizeSuppliers({
        suppliers: [supplier({
            offers: [{ materialType: 'cement', priceZAR: null, priceType: 'listed-current' }],
        })],
    });
    assert.equal(kept[0].offers[0].priceZAR, undefined);
    assert.equal(kept[0].offers[0].priceType, 'quote-required');
    assert.equal(kept[0].confidence, 'medium');
});

test('drops suppliers that are not in the cited hosts and merges duplicate names', () => {
    const filtered = normalizeSuppliers({
        suppliers: [supplier({ sourceUrl: 'https://other.example.net/store' })],
    }, ['www.cashbuild.co.za']);
    assert.equal(filtered.length, 0);

    const merged = normalizeSuppliers({
        suppliers: [
            supplier(),
            supplier({ name: 'Cashbuild Diepkloof Store', offers: [] }),
        ],
    });
    assert.equal(merged.length, 1);
    assert.equal(merged[0].offers.length, 1);
});

test('reads fenced json and ignores empty research', () => {
    assert.deepEqual(readJson('```json\n{"suppliers":[]}\n```').suppliers, []);
    assert.equal(readJson('not json'), null);
    assert.deepEqual(normalizeSuppliers(null), []);
});
