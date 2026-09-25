const assert = require('node:assert/strict');
const test = require('node:test');
const { chooseSpaceTally, tallyFromModel, tallyFromSelection } = require('./spaceTally');

test('counts rooms, bathrooms, and kitchens from selected furniture', () => {
    const tally = tallyFromSelection([
        { type: 'double-bed' },
        { type: 'single-bed' },
        { type: 'sofa' },
        { type: 'toilet' },
        { type: 'shower' },
        { type: 'gas-stove' },
        { type: 'refrigerator' },
    ]);
    assert.equal(tally.rooms, 3);
    assert.equal(tally.bathrooms, 1);
    assert.equal(tally.kitchens, 1);
    assert.equal(tally.garages, 0);
});

test('rejects an invented or out-of-range model tally', () => {
    assert.equal(tallyFromModel({ rooms: 2.5, bathrooms: 1, kitchens: 1, garages: 0 }), null);
    assert.equal(tallyFromModel({ rooms: 20, bathrooms: 1, kitchens: 1, garages: 0 }), null);
    assert.deepEqual(tallyFromModel({ rooms: 1, bathrooms: 1, kitchens: 1, garages: 1 }).garages, 1);
});

test('uses the concept tally only when the selection has no space cues', () => {
    const concept = { rooms: 2, bathrooms: 1, kitchens: 1, garages: 1, source: 'concept' };
    const fromPhoto = chooseSpaceTally([{ type: 'timber' }], concept);
    assert.equal(fromPhoto.rooms, 2);
    assert.equal(fromPhoto.garages, 1);
    const fromSelection = chooseSpaceTally([{ type: 'toilet' }], concept);
    assert.equal(fromSelection.bathrooms, 1);
    assert.equal(fromSelection.rooms, 0);
    assert.equal(fromSelection.garages, 1);
});
