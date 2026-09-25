const assert = require('node:assert/strict');
const test = require('node:test');
const { buildProjectPlan } = require('./projectPlan');
const { roofPlanes } = require('./quantities');
const { applyStructuredEdit } = require('./edits');
const {
    MATERIAL_IDS,
    toWorld,
    selectRenderBackend,
    wallFrame,
    polygonAreaMm2,
    planArea3,
    roofForFootprint,
    compileScene,
} = require('./scene');

function plan36() {
    return buildProjectPlan({
        property: { widthM: 10, lengthM: 15, desiredFloorAreaM2: 36 },
        materials: [
            { type: 'concrete-block', label: 'Concrete block' },
            { type: 'corrugated-roofing', label: 'Corrugated roofing' },
        ],
        projectId: 'plan-36',
        createdAt: '2026-09-23T10:00:00.000Z',
    });
}

test('1000 mm is one world unit and is not written back as a plan measurement', () => {
    assert.equal(toWorld(1000), 1);
    assert.equal(toWorld(3600), 3.6);
    assert.equal(toWorld(190), 0.19);
});

test('webgpu is preferred and webgl2 is the fallback', () => {
    assert.equal(selectRenderBackend({ hasWebGPU: true, hasWebGL2: true }), 'webgpu');
    assert.equal(selectRenderBackend({ hasWebGPU: true, webgpuInitFailed: true, hasWebGL2: true }), 'webgl2');
    assert.equal(selectRenderBackend({ hasWebGPU: false, hasWebGL2: true }), 'webgl2');
    assert.equal(selectRenderBackend({ hasWebGPU: false, hasWebGL2: false }), 'unavailable');
});

test('wall frame comes from the end coordinates', () => {
    const wall = {
        start: { xMm: 0, yMm: 0 },
        end: { xMm: 6000, yMm: 0 },
        heightMm: 2400,
        thicknessMm: 140,
    };
    const frame = wallFrame(wall);
    assert.equal(frame.lengthMm, 6000);
    assert.deepEqual(frame.midpoint, { xMm: 3000, yMm: 0 });
    assert.equal(frame.rotationRadians, 0);
    assert.equal(frame.heightMm, 2400);
    assert.equal(frame.thicknessMm, 140);
    const turned = wallFrame({ ...wall, end: { xMm: 0, yMm: 3600 } });
    assert.equal(turned.lengthMm, 3600);
    assert.equal(turned.rotationRadians, Math.PI / 2);
});

test('openings stay on their host wall and overlaps are rejected', () => {
    const plan = plan36();
    const scene = compileScene(plan);
    scene.openings.forEach((opening) => {
        const wall = scene.walls.find((item) => item.id === opening.wallId);
        assert.ok(wall);
        const frame = wallFrame(wall);
        assert.ok(opening.offsetFromWallStartMm >= 0);
        assert.ok(opening.offsetFromWallStartMm + opening.widthMm <= frame.lengthMm);
        assert.ok(opening.sillHeightMm + opening.heightMm <= wall.heightMm);
        if (opening.kind === 'door') assert.equal(opening.sillHeightMm, 0);
        if (opening.kind === 'window') assert.equal(opening.sillHeightMm, 900);
        const solids = wall.segments.filter((segment) => segment.kind === 'solid');
        const covered = solids.reduce((sum, segment) => sum + segment.lengthMm, 0);
        const hosted = scene.openings.filter((item) => item.wallId === wall.id);
        const opened = hosted.reduce((sum, item) => sum + item.widthMm, 0);
        assert.equal(covered + opened, frame.lengthMm);
    });

    const wall = plan.walls[0];
    const broken = compileScene({
        ...plan,
        openings: [
            { id: 'a', kind: 'window', wallId: wall.id, widthMm: 900, heightMm: 1200, offsetMm: 100, areaMm2: 900 * 1200 },
            { id: 'b', kind: 'window', wallId: wall.id, widthMm: 900, heightMm: 1200, offsetMm: 200, areaMm2: 900 * 1200 },
        ],
    });
    assert.equal(broken.windows.filter((item) => item.wallId === wall.id).length, 1);
    assert.ok(broken.warnings.some((warning) => warning.message.includes('overlap')));
});

test('floor polygons keep the room area', () => {
    const plan = plan36();
    const scene = compileScene(plan);
    scene.floors.forEach((floor) => {
        const room = plan.rooms.find((item) => item.id === floor.roomId);
        assert.equal(polygonAreaMm2(floor.polygon), room.areaMm2);
        assert.equal(floor.areaMm2, room.areaMm2);
    });
    const floorArea = scene.floors.reduce((sum, floor) => sum + floor.areaMm2, 0);
    assert.equal(floorArea, plan.geometry.footprint.areaMm2);
});

test('flat, mono-pitch, gable, and hip roofs are deterministic', () => {
    const footprint = { widthMm: 6000, lengthMm: 8000 };
    ['flat', 'mono-pitch', 'gable', 'hip'].forEach((type) => {
        const first = roofForFootprint(type, footprint);
        const second = roofForFootprint(type, footprint);
        assert.equal(first.status, 'SUPPORTED');
        assert.deepEqual(first, second);
        assert.ok(first.planes.length >= 1);
        first.planes.forEach((plane) => assert.ok(planArea3(plane.points) > 0));
    });
    const flat = roofForFootprint('flat', footprint, 2400, 15, 300);
    assert.equal(planArea3(flat.planes[0].points), (6000 + 600) * (8000 + 600));
    const unsupported = roofForFootprint('butterfly', footprint);
    assert.equal(unsupported.status, 'UNSUPPORTED_TOPOLOGY');
    assert.equal(unsupported.planes.length, 0);
});

test('the gable roof area matches the quantity takeoff', () => {
    const plan = plan36();
    const scene = compileScene(plan);
    const roof = scene.roofs[0];
    assert.equal(roof.type, 'gable');
    const drawn = roof.planes.reduce((sum, plane) => sum + planArea3(plane.points), 0);
    const expected = roofPlanes(plan.geometry.footprint).totalAreaMm2;
    assert.ok(Math.abs(drawn - expected) / expected < 0.002);
});

test('a 10 by 15 m plot does not become a 150 m2 model', () => {
    const plan = plan36();
    const scene = compileScene(plan);
    assert.equal(scene.site.plotAreaMm2, 150_000_000);
    assert.equal(scene.site.buildingAreaMm2, 36_000_000);
    assert.equal(toWorld(scene.site.buildingWidthMm) * toWorld(scene.site.buildingLengthMm), 36);
    assert.equal(scene.projectId, plan.projectId);
    assert.equal(scene.projectRevision, plan.revision);
    assert.equal(scene.units, 'mm');
    scene.materialBindings.forEach((binding) => assert.ok(MATERIAL_IDS.has(binding.materialId)));
    assert.equal(scene.materialBindings.find((item) => item.role === 'wall').materialId, 'concrete-block-painted');
    assert.equal(scene.materialBindings.find((item) => item.role === 'roof').materialId, 'corrugated-galvanized-steel');
    assert.deepEqual(compileScene(plan), scene);
});

test('a structured room edit creates a new revision and a matching scene', () => {
    const plan = plan36();
    const edited = applyStructuredEdit(plan, {
        operation: 'resize_room',
        roomId: 'sleep-1',
        deltaWidthMm: 600,
    }, {
        now: '2026-09-23T12:00:00.000Z',
        materialTypes: ['concrete-block', 'corrugated-roofing'],
    });
    assert.equal(edited.ok, true);
    assert.equal(edited.plan.revision, plan.revision + 1);
    assert.equal(edited.plan.geometry.footprint.areaMm2, 36_000_000);
    assert.equal(edited.plan.rooms.reduce((sum, room) => sum + room.areaMm2, 0), 36_000_000);
    const scene = compileScene(edited.plan);
    assert.equal(scene.projectRevision, edited.plan.revision);
    assert.notEqual(scene.projectRevision, plan.revision);
    const rejected = applyStructuredEdit(plan, { operation: 'resize_room', roomId: 'sleep-1', deltaWidthMm: 5000 });
    assert.equal(rejected.ok, false);
    assert.equal(rejected.plan.revision, plan.revision);
});
