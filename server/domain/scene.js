const { ROOF_OVERHANG_MM, ROOF_PITCH_DEGREES, WALL_HEIGHT_MM } = require('./layout');

const SCENE_SCHEMA_VERSION = '1.0.0';
const WINDOW_SILL_MM = 900;

const MATERIAL_IDS = new Set([
    'concrete-block-painted',
    'clay-brick',
    'corrugated-galvanized-steel',
    'treated-timber',
    'painted-plaster',
    'glass',
    'ground',
]);

const MATERIAL_FOR_TYPE = {
    'concrete-block': 'concrete-block-painted',
    'aac-block': 'concrete-block-painted',
    'clay-brick': 'clay-brick',
    'concrete-brick': 'clay-brick',
    'corrugated-roofing': 'corrugated-galvanized-steel',
    'ibr-roofing': 'corrugated-galvanized-steel',
    'metal-roofing': 'corrugated-galvanized-steel',
    'corrugated-metal-sheet': 'corrugated-galvanized-steel',
    timber: 'treated-timber',
    paint: 'painted-plaster',
};

const FURNITURE_SIZES = {
    bed: { widthMm: 1400, depthMm: 1900, heightMm: 500 },
    table: { widthMm: 800, depthMm: 800, heightMm: 750 },
    chair: { widthMm: 450, depthMm: 450, heightMm: 900 },
    sofa: { widthMm: 1800, depthMm: 800, heightMm: 800 },
    cupboard: { widthMm: 800, depthMm: 500, heightMm: 1800 },
    'kitchen-units': { widthMm: 1800, depthMm: 600, heightMm: 900 },
    sink: { widthMm: 500, depthMm: 400, heightMm: 200 },
    toilet: { widthMm: 400, depthMm: 650, heightMm: 400 },
    shower: { widthMm: 800, depthMm: 800, heightMm: 2000 },
};

function toWorld(mm) {
    return mm / 1000;
}

function selectRenderBackend({ hasWebGPU = false, webgpuInitFailed = false, hasWebGL2 = true } = {}) {
    if (hasWebGPU && !webgpuInitFailed) return 'webgpu';
    if (hasWebGL2) return 'webgl2';
    return 'unavailable';
}

function wallFrame(wall) {
    const dx = wall.end.xMm - wall.start.xMm;
    const dy = wall.end.yMm - wall.start.yMm;
    const lengthMm = Math.hypot(dx, dy);
    return {
        lengthMm,
        midpoint: {
            xMm: (wall.start.xMm + wall.end.xMm) / 2,
            yMm: (wall.start.yMm + wall.end.yMm) / 2,
        },
        rotationRadians: lengthMm === 0 ? 0 : Math.atan2(dy, dx),
        heightMm: wall.heightMm,
        thicknessMm: wall.thicknessMm,
    };
}

function polygonAreaMm2(points) {
    let sum = 0;
    for (let index = 0; index < points.length; index += 1) {
        const next = points[(index + 1) % points.length];
        sum += points[index].xMm * next.yMm - next.xMm * points[index].yMm;
    }
    return Math.abs(sum) / 2;
}

function planArea3(points) {
    if (points.length < 3) return 0;
    let area = 0;
    const origin = points[0];
    for (let index = 1; index < points.length - 1; index += 1) {
        const a = points[index];
        const b = points[index + 1];
        const ax = a.xMm - origin.xMm;
        const ay = a.yMm - origin.yMm;
        const az = a.elevationMm - origin.elevationMm;
        const bx = b.xMm - origin.xMm;
        const by = b.yMm - origin.yMm;
        const bz = b.elevationMm - origin.elevationMm;
        const cx = ay * bz - az * by;
        const cy = az * bx - ax * bz;
        const cz = ax * by - ay * bx;
        area += Math.hypot(cx, cy, cz) / 2;
    }
    return area;
}

function roofForFootprint(type, footprint, wallHeightMm = WALL_HEIGHT_MM, pitchDegrees = ROOF_PITCH_DEGREES, overhangMm = ROOF_OVERHANG_MM) {
    if (!footprint || !footprint.widthMm || !footprint.lengthMm) {
        return { type, status: 'UNSUPPORTED_TOPOLOGY', planes: [], reason: 'A rectangular footprint is required.' };
    }
    const supported = new Set(['flat', 'mono-pitch', 'gable', 'hip']);
    if (!supported.has(type)) {
        return { type, status: 'UNSUPPORTED_TOPOLOGY', planes: [], reason: `${type} is not a supported roof.` };
    }
    const width = footprint.widthMm;
    const length = footprint.lengthMm;
    const pitch = (pitchDegrees * Math.PI) / 180;
    const eave = wallHeightMm;
    const x0 = -overhangMm;
    const x1 = width + overhangMm;
    const y0 = -overhangMm;
    const y1 = length + overhangMm;
    const point = (xMm, yMm, elevationMm) => ({ xMm, yMm, elevationMm });

    if (type === 'flat') {
        return {
            type,
            status: 'SUPPORTED',
            pitchDegrees: 0,
            overhangMm,
            riseMm: 0,
            planes: [{
                id: 'flat',
                points: [point(x0, y0, eave), point(x1, y0, eave), point(x1, y1, eave), point(x0, y1, eave)],
            }],
        };
    }

    if (type === 'mono-pitch') {
        const run = width + overhangMm * 2;
        const rise = Math.round(run * Math.tan(pitch));
        return {
            type,
            status: 'SUPPORTED',
            pitchDegrees,
            overhangMm,
            riseMm: rise,
            planes: [{
                id: 'mono',
                points: [point(x0, y0, eave), point(x1, y0, eave + rise), point(x1, y1, eave + rise), point(x0, y1, eave)],
            }],
        };
    }

    const halfRun = width / 2 + overhangMm;
    const rise = Math.round(halfRun * Math.tan(pitch));
    const ridge = eave + rise;
    const mid = width / 2;

    if (type === 'gable') {
        return {
            type,
            status: 'SUPPORTED',
            pitchDegrees,
            overhangMm,
            riseMm: rise,
            planes: [
                {
                    id: 'gable-west',
                    points: [point(x0, y0, eave), point(mid, y0, ridge), point(mid, y1, ridge), point(x0, y1, eave)],
                },
                {
                    id: 'gable-east',
                    points: [point(mid, y0, ridge), point(x1, y0, eave), point(x1, y1, eave), point(mid, y1, ridge)],
                },
            ],
        };
    }

    const inset = width / 2;
    const ridgeStart = inset;
    const ridgeEnd = length - inset;
    const planes = [];
    if (ridgeEnd > ridgeStart) {
        planes.push({
            id: 'hip-south',
            points: [point(x0, y0, eave), point(x1, y0, eave), point(mid, ridgeStart, ridge)],
        });
        planes.push({
            id: 'hip-north',
            points: [point(x1, y1, eave), point(x0, y1, eave), point(mid, ridgeEnd, ridge)],
        });
        planes.push({
            id: 'hip-west',
            points: [point(x0, y0, eave), point(mid, ridgeStart, ridge), point(mid, ridgeEnd, ridge), point(x0, y1, eave)],
        });
        planes.push({
            id: 'hip-east',
            points: [point(x1, y0, eave), point(x1, y1, eave), point(mid, ridgeEnd, ridge), point(mid, ridgeStart, ridge)],
        });
    } else {
        planes.push(
            { id: 'hip-south', points: [point(x0, y0, eave), point(x1, y0, eave), point(mid, length / 2, ridge)] },
            { id: 'hip-north', points: [point(x1, y1, eave), point(x0, y1, eave), point(mid, length / 2, ridge)] },
            { id: 'hip-west', points: [point(x0, y0, eave), point(mid, length / 2, ridge), point(x0, y1, eave)] },
            { id: 'hip-east', points: [point(x1, y0, eave), point(x1, y1, eave), point(mid, length / 2, ridge)] },
        );
    }
    return { type, status: 'SUPPORTED', pitchDegrees, overhangMm, riseMm: rise, planes };
}

function classifyFurniture(type) {
    const name = `${type || ''}`;
    if (name.includes('bed') && !name.includes('bedside') && !name.includes('bedding')) return 'bed';
    if (name.includes('sofa')) return 'sofa';
    if (name.includes('chair')) return 'chair';
    if (name.includes('table')) return 'table';
    if (name.includes('cupboard') || name.includes('wardrobe') || name.includes('cabinet')) return 'cupboard';
    if (name.includes('toilet')) return 'toilet';
    if (name.includes('shower')) return 'shower';
    if (name.includes('sink') || name.includes('basin')) return 'sink';
    return null;
}

function roomForKind(rooms, kind) {
    if (kind === 'bed' || kind === 'cupboard') return rooms.find((room) => room.type === 'sleeping');
    if (kind === 'toilet' || kind === 'shower') return rooms.find((room) => room.type === 'bathroom');
    if (kind === 'sink' || kind === 'kitchen-units' || kind === 'table' || kind === 'chair') {
        return rooms.find((room) => room.type === 'kitchen');
    }
    return null;
}

function overlaps(a, b) {
    return a.xMm < b.xMm + b.widthMm
        && a.xMm + a.widthMm > b.xMm
        && a.yMm < b.yMm + b.depthMm
        && a.yMm + a.depthMm > b.yMm;
}

function placeItem(rooms, occupied, kind, id) {
    const size = FURNITURE_SIZES[kind];
    const room = roomForKind(rooms, kind);
    if (!room || !size) return { warning: `${kind} has no suitable room.` };
    const margin = 100;
    for (let y = room.yMm + margin; y + size.depthMm <= room.yMm + room.lengthMm - margin; y += 100) {
        for (let x = room.xMm + margin; x + size.widthMm <= room.xMm + room.widthMm - margin; x += 100) {
            const candidate = { xMm: x, yMm: y, widthMm: size.widthMm, depthMm: size.depthMm };
            if (occupied.some((item) => overlaps(item, candidate))) continue;
            const placed = {
                id,
                kind,
                roomId: room.id,
                xMm: x,
                yMm: y,
                widthMm: size.widthMm,
                depthMm: size.depthMm,
                heightMm: size.heightMm,
                materialId: kind === 'sink' || kind === 'toilet' || kind === 'shower' ? 'painted-plaster' : 'treated-timber',
            };
            occupied.push(placed);
            return { placed };
        }
    }
    return { warning: `${kind} does not fit in ${room.name}.` };
}

function validateOpenings(wall, openings) {
    const frame = wallFrame(wall);
    const hosted = openings
        .filter((opening) => opening.wallId === wall.id)
        .slice()
        .sort((a, b) => a.offsetMm - b.offsetMm || a.id.localeCompare(b.id));
    const accepted = [];
    const rejected = [];
    let cursor = 0;
    hosted.forEach((opening) => {
        const sillHeightMm = opening.kind === 'window' ? WINDOW_SILL_MM : 0;
        const reasons = [];
        if (opening.offsetMm < 0 || opening.offsetMm + opening.widthMm > frame.lengthMm + 0.001) reasons.push('outside-wall');
        if (opening.heightMm <= 0 || opening.heightMm > wall.heightMm) reasons.push('height');
        if (sillHeightMm < 0 || sillHeightMm + opening.heightMm > wall.heightMm) reasons.push('sill');
        if (opening.kind === 'door' && sillHeightMm !== 0) reasons.push('door-bottom');
        if (opening.offsetMm < cursor) reasons.push('overlap');
        if (reasons.length) {
            rejected.push({ id: opening.id, reasons });
            return;
        }
        accepted.push({
            id: opening.id,
            wallId: wall.id,
            kind: opening.kind,
            offsetFromWallStartMm: opening.offsetMm,
            widthMm: opening.widthMm,
            heightMm: opening.heightMm,
            sillHeightMm,
        });
        cursor = opening.offsetMm + opening.widthMm;
    });
    return { accepted, rejected, lengthMm: frame.lengthMm };
}

function segmentsFor(wall, openings) {
    const lengthMm = wallFrame(wall).lengthMm;
    const segments = [];
    let cursor = 0;
    const add = (kind, offsetMm, segmentLength, bottomMm, heightMm) => {
        if (segmentLength < 1 || heightMm < 1) return;
        segments.push({ kind, offsetMm, lengthMm: segmentLength, bottomMm, heightMm });
    };
    openings.forEach((opening) => {
        add('solid', cursor, opening.offsetFromWallStartMm - cursor, 0, wall.heightMm);
        add('sill', opening.offsetFromWallStartMm, opening.widthMm, 0, opening.sillHeightMm);
        const head = opening.sillHeightMm + opening.heightMm;
        add(opening.kind === 'door' ? 'lintel' : 'head', opening.offsetFromWallStartMm, opening.widthMm, head, wall.heightMm - head);
        cursor = opening.offsetFromWallStartMm + opening.widthMm;
    });
    add('solid', cursor, lengthMm - cursor, 0, wall.heightMm);
    return segments;
}

function materialIdFor(types, allowed, fallback) {
    const match = (types || [])
        .filter((type) => allowed.includes(type))
        .map((type) => MATERIAL_FOR_TYPE[type])
        .find(Boolean);
    return MATERIAL_IDS.has(match) ? match : fallback;
}

function compileScene(plan, options = {}) {
    const warnings = [];
    const empty = {
        schemaVersion: SCENE_SCHEMA_VERSION,
        projectId: plan.projectId,
        projectRevision: plan.revision,
        units: 'mm',
        renderStatus: 'UNAVAILABLE',
        warnings,
        site: null,
        storeys: [],
        floors: [],
        walls: [],
        openings: [],
        doors: [],
        windows: [],
        roofs: [],
        fixtures: [],
        furniture: [],
        materialBindings: [],
        cameraHints: null,
    };
    const footprint = plan.geometry?.footprint;
    if (!footprint || plan.geometry.status !== 'SOLVED') {
        warnings.push({ code: 'NO_FOOTPRINT', message: 'No dwelling footprint is available to render.' });
        return empty;
    }

    const selected = options.materialTypes || (plan.quantityTakeoff || []).map((item) => item.itemId);
    const wallMaterial = materialIdFor(selected, ['concrete-block', 'aac-block', 'clay-brick', 'concrete-brick'], 'concrete-block-painted');
    const roofMaterial = materialIdFor(selected, ['corrugated-roofing', 'ibr-roofing', 'metal-roofing', 'corrugated-metal-sheet'], 'corrugated-galvanized-steel');
    const openings = [];
    const rejectedIds = new Set();
    (plan.openings || []).forEach((opening) => {
        if (!(plan.walls || []).some((wall) => wall.id === opening.wallId)) {
            warnings.push({ code: 'OPENING_HOST', message: `${opening.id} has no host wall.` });
            rejectedIds.add(opening.id);
        }
    });

    const walls = (plan.walls || []).map((wall) => {
        const hosted = (plan.openings || []).filter((opening) => opening.wallId === wall.id && !rejectedIds.has(opening.id));
        const checked = validateOpenings(wall, hosted);
        checked.rejected.forEach((item) => {
            warnings.push({ code: 'OPENING_REJECTED', message: `${item.id} was not rendered (${item.reasons.join(', ')}).` });
        });
        openings.push(...checked.accepted);
        return {
            id: wall.id,
            start: wall.start,
            end: wall.end,
            thicknessMm: wall.thicknessMm,
            heightMm: wall.heightMm,
            exterior: wall.exterior,
            roomIds: wall.roomIds,
            segments: segmentsFor(wall, checked.accepted),
        };
    });

    const floors = (plan.rooms || []).map((room) => {
        const area = polygonAreaMm2(room.polygon);
        if (area !== room.areaMm2) {
            warnings.push({ code: 'FLOOR_AREA', message: `${room.id} polygon area does not match the plan.` });
        }
        return {
            id: `floor-${room.id}`,
            roomId: room.id,
            polygon: room.polygon,
            thicknessMm: 100,
            areaMm2: area,
        };
    });

    const roof = roofForFootprint('gable', footprint, WALL_HEIGHT_MM, ROOF_PITCH_DEGREES, ROOF_OVERHANG_MM);
    if (roof.status !== 'SUPPORTED') {
        warnings.push({ code: 'ROOF', message: roof.reason || 'Roof topology is unsupported.' });
    }

    const occupied = [];
    const fixtures = [];
    ['toilet', 'shower', 'sink', 'kitchen-units'].forEach((kind) => {
        const result = placeItem(plan.rooms, occupied, kind, `fixture-${kind}`);
        if (result.placed) fixtures.push(result.placed);
        else if (result.warning) warnings.push({ code: 'FIXTURE_PARTIAL', message: result.warning });
    });
    const furniture = [];
    (options.furniture || []).forEach((item, index) => {
        const kind = classifyFurniture(item.type);
        if (!kind) {
            warnings.push({ code: 'FURNITURE_PARTIAL', message: `${item.type || 'item'} has no 3D definition.` });
            return;
        }
        if (kind === 'toilet' || kind === 'shower' || kind === 'sink') {
            const result = placeItem(plan.rooms, occupied, kind, `selected-${kind}-${index + 1}`);
            if (result.placed) fixtures.push(result.placed);
            else warnings.push({ code: 'FIXTURE_PARTIAL', message: result.warning });
            return;
        }
        const result = placeItem(plan.rooms, occupied, kind, `furniture-${kind}-${index + 1}`);
        if (result.placed) furniture.push(result.placed);
        else warnings.push({ code: 'FURNITURE_PARTIAL', message: result.warning });
    });

    const building = {
        plotWidthMm: plan.site.plotWidthMm,
        plotLengthMm: plan.site.plotLengthMm,
        plotAreaMm2: plan.site.plotAreaMm2,
        buildingWidthMm: footprint.widthMm,
        buildingLengthMm: footprint.lengthMm,
        buildingAreaMm2: footprint.areaMm2,
    };

    return {
        schemaVersion: SCENE_SCHEMA_VERSION,
        projectId: plan.projectId,
        projectRevision: plan.revision,
        units: 'mm',
        renderStatus: warnings.length ? 'COMPLETE_WITH_WARNINGS' : 'COMPLETE',
        warnings,
        site: building,
        storeys: [{ id: 'storey-1', elevationMm: 0, heightMm: WALL_HEIGHT_MM }],
        floors,
        walls,
        openings,
        doors: openings.filter((opening) => opening.kind === 'door'),
        windows: openings.filter((opening) => opening.kind === 'window'),
        roofs: roof.status === 'SUPPORTED' ? [roof] : [],
        fixtures,
        furniture,
        materialBindings: [
            { role: 'wall', materialId: wallMaterial },
            { role: 'roof', materialId: roofMaterial },
            { role: 'floor', materialId: 'painted-plaster' },
            { role: 'door', materialId: 'treated-timber' },
            { role: 'window', materialId: 'glass' },
            { role: 'ground', materialId: 'ground' },
        ],
        cameraHints: {
            target: {
                xMm: footprint.widthMm / 2,
                yMm: footprint.lengthMm / 2,
                elevationMm: WALL_HEIGHT_MM / 2,
            },
            radiusMm: Math.max(footprint.widthMm, footprint.lengthMm) * 2,
        },
    };
}

module.exports = {
    SCENE_SCHEMA_VERSION,
    MATERIAL_IDS,
    toWorld,
    selectRenderBackend,
    wallFrame,
    polygonAreaMm2,
    planArea3,
    roofForFootprint,
    validateOpenings,
    segmentsFor,
    compileScene,
};
