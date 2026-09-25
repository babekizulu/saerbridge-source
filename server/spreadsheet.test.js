const assert = require('node:assert/strict');
const test = require('node:test');
const { buildSpreadsheet } = require('./spreadsheet');

function csvText(base64) {
    return Buffer.from(base64, 'base64').toString('utf8').replace(/^\uFEFF/, '');
}

test('writes the same cost figures into the csv', async () => {
    const cost = {
        lines: [{
            category: 'Structural materials',
            materialType: 'cement',
            description: 'Cement',
            quantity: 10,
            unit: 'bags',
            unitPriceZAR: 99.5,
            quantityCostZAR: 995,
            supplierName: 'Cashbuild Diepkloof',
            priceConfidence: 'verified-listed',
            assumptions: 'Planning allowance.',
        }],
        materialsSubtotalZAR: 995,
        contingencyPercent: 12,
        contingencyZAR: 119.4,
        estimatedTotalZAR: 1114.4,
        lowEstimateZAR: 947.24,
        highEstimateZAR: 1393,
        assumptions: ['Approximate planning estimate.'],
    };
    const suppliers = [{
        name: 'Cashbuild Diepkloof',
        address: 'Diepkloof Square',
        suburb: 'Diepkloof',
        city: 'Johannesburg',
        materialCategories: ['Cement'],
        website: 'https://www.cashbuild.co.za',
        offers: [{ priceZAR: 99.5 }],
        sourceUrl: 'https://www.cashbuild.co.za/store',
        checkedAt: '2026-09-22T12:00:00.000Z',
    }];
    const csv = csvText(await buildSpreadsheet({
        renovation: true,
        area: 'Soweto, Johannesburg, Gauteng',
        property: { widthM: 8, lengthM: 12 },
        cost,
        suppliers,
        generatedAt: '2026-09-22T12:00:00.000Z',
    }));
    assert.match(csv, /Project Summary/);
    assert.match(csv, /"Soweto, Johannesburg, Gauteng"/);
    assert.match(csv, /Estimated central cost \(ZAR\),1114\.4/);
    assert.match(csv, /Structural materials,cement,Cement,10,bags,99\.5,995,Cashbuild Diepkloof/);
    assert.match(csv, /Known material subtotal,,,,,,995/);
    assert.equal(csv.includes('SUM('), false);
    assert.match(csv, /Suppliers/);
    assert.match(csv, /"Diepkloof Square, Diepkloof, Johannesburg"/);
});

test('does not place untrusted text in a formula', async () => {
    const cost = {
        lines: [{
            category: '=cmd',
            materialType: 'paint',
            description: '+unsafe',
            priceConfidence: 'unknown',
            assumptions: '@note',
        }],
        assumptions: ['-keep this text'],
    };
    const csv = csvText(await buildSpreadsheet({
        renovation: false,
        area: '',
        property: null,
        cost,
        suppliers: [],
        generatedAt: '2026-09-22T12:00:00.000Z',
    }));
    assert.match(csv, /'=cmd/);
    assert.match(csv, /'\+unsafe/);
    assert.match(csv, /'@note/);
    assert.match(csv, /'-keep this text/);
    assert.equal(csv.includes('\n=cmd'), false);
    assert.equal(csv.includes('\n+unsafe'), false);
});
