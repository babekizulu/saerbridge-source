const BEDS = new Set(['single-bed', 'double-bed', 'queen-bed', 'bunk-bed', 'cot', 'crib']);
const LIVING = new Set(['sofa', 'loveseat', 'armchair', 'lounge-chair']);
const WORK = new Set(['desk', 'office-chair']);
const TOILETS = new Set(['toilet']);
const BATH = new Set(['toilet', 'wash-basin', 'bathroom-vanity', 'shower', 'bathtub', 'shower-enclosure', 'bathroom-cabinet']);
const COOKING = new Set(['stove', 'gas-stove', 'induction-plate', 'oven', 'cooktop']);
const KITCHEN = new Set([
    'kitchen-sink', 'stove', 'gas-stove', 'induction-plate', 'oven', 'cooktop',
    'refrigerator', 'freezer', 'microwave', 'dishwasher', 'kitchen-island',
    'kitchen-cabinet', 'kitchen-countertop', 'range-hood',
]);

function countOf(items, names) {
    return items.filter((item) => names.has(item.type)).length;
}

function hasAny(items, names) {
    return items.some((item) => names.has(item.type));
}

function tallyFromSelection(furniture) {
    const rooms = countOf(furniture, BEDS)
        + (hasAny(furniture, LIVING) ? 1 : 0)
        + (hasAny(furniture, WORK) ? 1 : 0);
    const toilets = countOf(furniture, TOILETS);
    const bathrooms = toilets > 0 ? toilets : (hasAny(furniture, BATH) ? 1 : 0);
    const cookers = countOf(furniture, COOKING);
    const kitchens = cookers > 0 ? cookers : (hasAny(furniture, KITCHEN) ? 1 : 0);
    return {
        rooms,
        bathrooms,
        kitchens,
        garages: 0,
        source: 'selection',
    };
}

function tallyFromModel(value) {
    if (!value || typeof value !== 'object') return null;
    const read = (key) => {
        const number = value[key];
        if (typeof number !== 'number' || !Number.isInteger(number) || number < 0 || number > 12) return null;
        return number;
    };
    const rooms = read('rooms');
    const bathrooms = read('bathrooms');
    const kitchens = read('kitchens');
    const garages = read('garages');
    if ([rooms, bathrooms, kitchens, garages].some((entry) => entry == null)) return null;
    return { rooms, bathrooms, kitchens, garages, source: 'concept' };
}

function chooseSpaceTally(furniture, modelTally) {
    const fromItems = tallyFromSelection(furniture || []);
    const signal = fromItems.rooms + fromItems.bathrooms + fromItems.kitchens;
    if (signal > 0) {
        return {
            ...fromItems,
            garages: modelTally && modelTally.garages > 0 ? modelTally.garages : 0,
        };
    }
    return modelTally || fromItems;
}

module.exports = {
    tallyFromSelection,
    tallyFromModel,
    chooseSpaceTally,
};
