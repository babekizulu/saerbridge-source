const assert = require('node:assert/strict');
const test = require('node:test');
const { buildCostAnalysis, money } = require('./costing');

const cement = { type: 'cement', label: 'Cement' };
const brick = { type: 'brick', label: 'Brick' };

test('calculates a ranged estimate from dimensions and a listed price', () => {
    const cost = buildCostAnalysis({
        materials: [cement],
        furniture: [],
        property: { widthM: 8, lengthM: 12 },
        suppliers: [{
            id: 's1',
            name: 'Example Merchant',
            materialCategories: ['cement'],
            offers: [{ materialType: 'cement', priceZAR: 99.5, priceType: 'listed-current', unit: 'bag' }],
        }],
    });
    const line = cost.lines[0];
    assert.equal(line.quantity, 10);
    assert.equal(line.quantityCostZAR, money(995));
    assert.equal(cost.materialsSubtotalZAR, 995);
    assert.equal(cost.contingencyPercent, 12);
    assert.equal(cost.contingencyZAR, money(995 * 0.12));
    assert.equal(cost.estimatedTotalZAR, money(995 * 1.12));
    assert.equal(cost.lowEstimateZAR, money(cost.estimatedTotalZAR * 0.85));
    assert.equal(cost.highEstimateZAR, money(cost.estimatedTotalZAR * 1.25));
    assert.equal(cost.deliveryEstimateZAR, undefined);
    assert.equal(line.priceConfidence, 'verified-listed');
});

test('omits totals when a price or quantity is missing', () => {
    const unpriced = buildCostAnalysis({
        materials: [brick],
        furniture: [{ type: 'bed', label: 'Bed' }],
        property: { widthM: 8, lengthM: 12 },
        suppliers: [{
            id: 's2',
            name: 'Quote Yard',
            materialCategories: ['brick'],
            offers: [{ materialType: 'brick', priceType: 'quote-required' }],
        }],
    });
    assert.equal(unpriced.lines[0].quantity > 0, true);
    assert.equal(unpriced.lines[0].quantityCostZAR, undefined);
    assert.equal(unpriced.estimatedTotalZAR, undefined);

    const unmeasured = buildCostAnalysis({
        materials: [cement],
        furniture: [],
        property: null,
        suppliers: [{
            id: 's3',
            name: 'Listed Yard',
            materialCategories: [],
            offers: [{ materialType: 'cement', priceZAR: 10.25, priceType: 'estimated' }],
        }],
    });
    assert.equal(unmeasured.lines[0].quantity, undefined);
    assert.equal(unmeasured.lines[0].unitPriceZAR, 10.25);
    assert.equal(unmeasured.estimatedTotalZAR, undefined);
    assert.match(unmeasured.assumptions[0], /measurements were not provided/);
});

test('keeps decimal prices and does not invent delivery', () => {
    const cost = buildCostAnalysis({
        materials: [cement],
        furniture: [],
        property: { desiredFloorAreaM2: 36 },
        suppliers: [],
    });
    assert.equal(cost.lines.length, 1);
    assert.equal(cost.lines[0].quantity, 10);
    assert.equal(cost.metrics.floorArea, 36);
    assert.equal(cost.deliveryEstimateZAR, undefined);
});

test('applies brick quantities to clay brick from the catalog', () => {
    const cost = buildCostAnalysis({
        materials: [{ type: 'clay-brick', label: 'Clay brick' }],
        furniture: [],
        property: { widthM: 6, lengthM: 8 },
        suppliers: [],
    });
    assert.equal(cost.lines[0].category, 'Walls');
    assert.equal(cost.lines[0].unit, 'bricks');
    assert.equal(cost.lines[0].quantity > 0, true);
});
