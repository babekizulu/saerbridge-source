const assert = require('node:assert/strict');
const test = require('node:test');
const { buildProjectPlan } = require('./projectPlan');
const { packsFor } = require('./quantities');
const { csvFromPlan, costFromPlan } = require('./exports');
const { blueprintSvg, blueprintDxf } = require('./drawings');
const { buildPdf } = require('../design');
const { lengthMm } = require('./units');

function plan36() {
    return buildProjectPlan({
        property: { widthM: 10, lengthM: 15, desiredFloorAreaM2: 36 },
        materials: [
            { type: 'concrete-block', label: 'Concrete block' },
            { type: 'concrete', label: 'Concrete' },
            { type: 'corrugated-roofing', label: 'Corrugated roofing' },
            { type: 'metal-roofing', label: 'Metal roofing' },
        ],
        projectId: 'plan-36',
        createdAt: '2026-09-23T10:00:00.000Z',
    });
}

test('cost preview uses pack count instead of labelling sheet count as packs', () => {
    const plan = plan36();
    const roof = plan.quantityTakeoff.find((item) => item.sellingUnit === 'pack');
    const line = costFromPlan(plan).lines.find((item) => item.materialType === roof.itemId);
    assert.equal(line.quantity, roof.packsToBuy);
    assert.equal(line.unit, 'pack');
    assert.equal(roof.purchaseQuantity, line.quantity * roof.packSize);
});

test('a 10 by 15 m plot with a 36 m2 dwelling does not become a 150 m2 dwelling', () => {
    const plan = plan36();
    assert.equal(plan.site.plotAreaMm2, 150_000_000);
    assert.equal(plan.geometry.footprint.areaMm2, 36_000_000);
    assert.equal(plan.geometry.reconciled, true);
    const roomArea = plan.rooms.reduce((sum, room) => sum + room.areaMm2, 0);
    assert.equal(roomArea, plan.geometry.footprint.areaMm2);
    assert.equal(plan.rooms.length, 4);
});

test('wall lengths come from coordinates and openings stay on their walls', () => {
    const plan = plan36();
    plan.walls.forEach((wall) => {
        assert.equal(wall.lengthMm, lengthMm(wall.start, wall.end));
        assert.ok(wall.lengthMm > 0);
    });
    plan.openings.forEach((opening) => {
        const wall = plan.walls.find((item) => item.id === opening.wallId);
        assert.ok(wall);
        assert.ok(opening.widthMm < wall.lengthMm);
        assert.ok(opening.areaMm2 > 0);
    });
    const outside = plan.rooms.some((room) => (
        room.xMm < 0
        || room.yMm < 0
        || room.xMm + room.widthMm > plan.geometry.footprint.widthMm
        || room.yMm + room.lengthMm > plan.geometry.footprint.lengthMm
    ));
    assert.equal(outside, false);
});

test('concrete blocks are counted as blocks and poured concrete stays a slab volume', () => {
    const plan = plan36();
    const blocks = plan.quantityTakeoff.find((item) => item.itemId === 'concrete-block');
    const slab = plan.quantityTakeoff.find((item) => item.itemId === 'concrete-slab');
    assert.equal(blocks.requiredUnit, 'each');
    assert.notEqual(blocks.requiredUnit, 'm3');
    assert.equal(slab.requiredUnit, 'm3');
    assert.ok(blocks.requiredQuantity > 0);
    assert.match(blocks.specification, /Not poured concrete/);
});

test('two roof coverings do not double the roof', () => {
    const plan = plan36();
    const roofs = plan.quantityTakeoff.filter((item) => item.assemblyId === 'corrugated-sheet-roof');
    assert.equal(roofs.length, 1);
    assert.deepEqual(roofs[0].duplicateIgnored, ['metal-roofing']);
    assert.equal(roofs[0].packsToBuy, Math.ceil(roofs[0].requiredQuantity / 10));
});

test('83 sheets in packs of 10 require 9 packs', () => {
    const packed = packsFor(83, 10);
    assert.equal(packed.purchaseQuantity, 9);
    assert.notEqual(packed.purchaseQuantity, 83);
});

test('the same window count is in the plan, csv, and svg', () => {
    const plan = plan36();
    const windows = plan.openings.filter((opening) => opening.kind === 'window').length;
    const csv = Buffer.from(csvFromPlan(plan), 'base64').toString('utf8');
    const svg = blueprintSvg(plan);
    const dxf = blueprintDxf(plan);
    assert.match(csv, new RegExp(`window,Openings,Window,[^,]*,${windows},each`));
    assert.match(plan.scheduleText, new RegExp(`Windows: ${windows}`));
    assert.match(svg, /Sleeping space 1/);
    assert.match(svg, /36 m2/);
    assert.match(dxf, /A-WALL-EXTR/);
    assert.match(csv, /plan-36,1,/);
    assert.equal(plan.affordability.status, 'CANNOT_ASSESS');
});

test('plot dimensions alone do not invent a dwelling that covers the plot', () => {
    const plan = buildProjectPlan({
        property: { widthM: 10, lengthM: 15 },
        materials: [],
        projectId: 'plot-only',
        createdAt: '2026-09-23T10:00:00.000Z',
    });
    assert.equal(plan.outputStatus, 'SPECIFICATION_REQUIRED');
    assert.equal(plan.rooms.length, 0);
    assert.equal(plan.site.plotAreaMm2, 150_000_000);
});

test('a larger opening cannot increase net wall area', () => {
    const plan = plan36();
    const blocks = plan.quantityTakeoff.find((item) => item.assemblyId === 'block-wall');
    const before = blocks.inputs.netWallMm2;
    const opening = plan.openings.find((item) => item.kind === 'window');
    const bigger = opening.areaMm2 + 1000;
    const net = blocks.inputs.grossWallMm2 - (blocks.inputs.openingMm2 - opening.areaMm2 + bigger);
    assert.ok(net < before);
});

test('the pdf blueprint uses the same project id and footprint', async () => {
    const plan = plan36();
    const pdf = await buildPdf({
        materials: [],
        furniture: [],
        instructions: {
            summary: plan.scheduleText,
            sections: [{ heading: 'Authoritative floor plan', body: plan.scheduleText }],
        },
        property: { widthM: 10, lengthM: 15, desiredFloorAreaM2: 36 },
        context: {
            plan: {
                projectId: plan.projectId,
                revision: plan.revision,
                footprint: plan.geometry.footprint,
                rooms: plan.rooms,
            },
            cost: {},
        },
    });
    const bytes = Buffer.from(pdf, 'base64');
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    assert.equal(plan.site.plotAreaMm2, 150_000_000);
    assert.equal(plan.geometry.footprint.areaMm2, 36_000_000);
    assert.match(plan.scheduleText, /plan-36 revision 1/);
});
