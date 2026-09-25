const { GRID_MM, allocateMm, rectAreaMm2, lengthMm } = require('./units');

const WALL_HEIGHT_MM = 2400;
const EXTERIOR_THICKNESS_MM = 140;
const ROOF_PITCH_DEGREES = 15;
const ROOF_OVERHANG_MM = 300;

function footprintForTarget(plotWidthMm, plotLengthMm, targetAreaMm2) {
    if (!targetAreaMm2 || targetAreaMm2 <= 0) {
        return { status: 'SPECIFICATION_REQUIRED', reason: 'A desired dwelling area is required. Plot width times plot length is not used as the building area.' };
    }
    const maxWidth = plotWidthMm || targetAreaMm2;
    const maxLength = plotLengthMm || targetAreaMm2;
    let best = null;
    for (let width = GRID_MM; width <= maxWidth; width += GRID_MM) {
        if (targetAreaMm2 % width !== 0) continue;
        const length = targetAreaMm2 / width;
        if (length % GRID_MM !== 0 || length > maxLength) continue;
        const score = Math.abs(width - length);
        if (!best || score < best.score || (score === best.score && width <= length)) {
            best = { widthMm: width, lengthMm: length, score };
        }
    }
    if (!best) {
        return {
            status: 'SPECIFICATION_REQUIRED',
            reason: 'No orthogonal footprint on the planning grid fits the plot and matches the desired dwelling area.',
        };
    }
    return {
        status: 'SOLVED',
        widthMm: best.widthMm,
        lengthMm: best.lengthMm,
        areaMm2: rectAreaMm2(best.widthMm, best.lengthMm),
    };
}

function programRooms() {
    return [
        { id: 'sleep-1', type: 'sleeping', name: 'Sleeping space 1' },
        { id: 'sleep-2', type: 'sleeping', name: 'Sleeping space 2' },
        { id: 'kitchen', type: 'kitchen', name: 'Kitchen' },
        { id: 'bathroom', type: 'bathroom', name: 'Bathroom' },
    ];
}

function placeRooms(widthMm, lengthMm) {
    const [sleepDepth, serviceDepth] = allocateMm(lengthMm, [3, 2]);
    const sleepWidths = allocateMm(widthMm, [1, 1]);
    const serviceWidths = allocateMm(widthMm, [3, 2]);
    const rooms = [];
    let x = 0;
    sleepWidths.forEach((roomWidth, index) => {
        rooms.push({
            id: `sleep-${index + 1}`,
            type: 'sleeping',
            name: `Sleeping space ${index + 1}`,
            xMm: x,
            yMm: 0,
            widthMm: roomWidth,
            lengthMm: sleepDepth,
        });
        x += roomWidth;
    });
    x = 0;
    const service = [
        { id: 'kitchen', type: 'kitchen', name: 'Kitchen' },
        { id: 'bathroom', type: 'bathroom', name: 'Bathroom' },
    ];
    service.forEach((room, index) => {
        rooms.push({
            ...room,
            xMm: x,
            yMm: sleepDepth,
            widthMm: serviceWidths[index],
            lengthMm: serviceDepth,
        });
        x += serviceWidths[index];
    });
    return rooms.map((room) => ({
        ...room,
        areaMm2: rectAreaMm2(room.widthMm, room.lengthMm),
        polygon: [
            { xMm: room.xMm, yMm: room.yMm },
            { xMm: room.xMm + room.widthMm, yMm: room.yMm },
            { xMm: room.xMm + room.widthMm, yMm: room.yMm + room.lengthMm },
            { xMm: room.xMm, yMm: room.yMm + room.lengthMm },
        ],
    }));
}

function edgeKey(x1, y1, x2, y2) {
    const forward = `${x1},${y1}|${x2},${y2}`;
    const reverse = `${x2},${y2}|${x1},${y1}`;
    return forward < reverse ? forward : reverse;
}

function wallsFromRooms(rooms, envelopeWidthMm, envelopeLengthMm) {
    const edges = new Map();
    const add = (x1, y1, x2, y2, roomId) => {
        const key = edgeKey(x1, y1, x2, y2);
        const current = edges.get(key) || {
            start: { xMm: Math.min(x1, x2) === x1 && Math.min(y1, y2) === y1 ? x1 : x2, yMm: 0 },
            roomIds: [],
        };
        const start = x1 < x2 || (x1 === x2 && y1 <= y2) ? { xMm: x1, yMm: y1 } : { xMm: x2, yMm: y2 };
        const end = start.xMm === x1 && start.yMm === y1 ? { xMm: x2, yMm: y2 } : { xMm: x1, yMm: y1 };
        current.start = start;
        current.end = end;
        current.roomIds.push(roomId);
        edges.set(key, current);
    };
    rooms.forEach((room) => {
        const x = room.xMm;
        const y = room.yMm;
        const x2 = room.xMm + room.widthMm;
        const y2 = room.yMm + room.lengthMm;
        add(x, y, x2, y, room.id);
        add(x2, y, x2, y2, room.id);
        add(x2, y2, x, y2, room.id);
        add(x, y2, x, y, room.id);
    });
    return [...edges.values()].map((edge, index) => {
        const onBoundary = [edge.start, edge.end].every((point) => (
            point.xMm === 0 || point.xMm === envelopeWidthMm || point.yMm === 0 || point.yMm === envelopeLengthMm
        )) && (
            edge.start.xMm === edge.end.xMm
                ? (edge.start.xMm === 0 || edge.start.xMm === envelopeWidthMm)
                : (edge.start.yMm === 0 || edge.start.yMm === envelopeLengthMm)
        );
        return {
            id: `wall-${index + 1}`,
            start: edge.start,
            end: edge.end,
            lengthMm: lengthMm(edge.start, edge.end),
            thicknessMm: EXTERIOR_THICKNESS_MM,
            heightMm: WALL_HEIGHT_MM,
            exterior: onBoundary && edge.roomIds.length === 1,
            roomIds: edge.roomIds,
        };
    });
}

function openingOnWall(wall, kind, width, height) {
    if (wall.lengthMm < width + 200) return null;
    return {
        id: `${kind}-${wall.id}`,
        kind,
        wallId: wall.id,
        widthMm: width,
        heightMm: height,
        areaMm2: width * height,
        offsetMm: Math.round((wall.lengthMm - width) / 2),
    };
}

function openingsFor(walls) {
    const openings = [];
    const exterior = walls.filter((wall) => wall.exterior);
    const doorWall = exterior.slice().sort((a, b) => b.lengthMm - a.lengthMm)[0];
    if (doorWall) {
        const door = openingOnWall(doorWall, 'door', 900, 2100);
        if (door) openings.push({ ...door, id: 'door-exterior' });
    }
    exterior.forEach((wall) => {
        if (doorWall && wall.id === doorWall.id) return;
        const window = openingOnWall(wall, 'window', 900, 1200);
        if (window) openings.push(window);
    });
    walls.filter((wall) => !wall.exterior).forEach((wall) => {
        const door = openingOnWall(wall, 'door', 800, 2100);
        if (door) openings.push(door);
    });
    return openings;
}

function layoutAssumptions() {
    return [
        'Rooms are orthogonal and measured to wall centre-lines, so their areas sum to the gross footprint.',
        `Exterior wall thickness used for quantities is ${EXTERIOR_THICKNESS_MM} mm. It is not a structural design.`,
        `Wall height used for quantities is ${WALL_HEIGHT_MM} mm.`,
        `Roof pitch is ${ROOF_PITCH_DEGREES} degrees with a ${ROOF_OVERHANG_MM} mm overhang. This is a planning assumption, not an engineered truss.`,
    ];
}

function syncRoom(room) {
    return {
        ...room,
        areaMm2: rectAreaMm2(room.widthMm, room.lengthMm),
        polygon: [
            { xMm: room.xMm, yMm: room.yMm },
            { xMm: room.xMm + room.widthMm, yMm: room.yMm },
            { xMm: room.xMm + room.widthMm, yMm: room.yMm + room.lengthMm },
            { xMm: room.xMm, yMm: room.yMm + room.lengthMm },
        ],
    };
}

function layoutFromRooms(footprint, rooms) {
    const synced = rooms.map(syncRoom);
    const walls = wallsFromRooms(synced, footprint.widthMm, footprint.lengthMm);
    const openings = openingsFor(walls);
    const roomArea = synced.reduce((sum, room) => sum + room.areaMm2, 0);
    return {
        status: 'SOLVED',
        footprint,
        rooms: synced,
        walls,
        openings,
        reconciled: roomArea === footprint.areaMm2,
        assumptions: layoutAssumptions(),
    };
}

function solveLayout(problem) {
    const footprint = footprintForTarget(problem.plotWidthMm, problem.plotLengthMm, problem.targetAreaMm2);
    if (footprint.status !== 'SOLVED') {
        return { status: footprint.status, reason: footprint.reason, rooms: [], walls: [], openings: [] };
    }
    return layoutFromRooms(footprint, placeRooms(footprint.widthMm, footprint.lengthMm));
}

module.exports = {
    WALL_HEIGHT_MM,
    EXTERIOR_THICKNESS_MM,
    ROOF_PITCH_DEGREES,
    ROOF_OVERHANG_MM,
    footprintForTarget,
    solveLayout,
    layoutFromRooms,
    programRooms,
};
