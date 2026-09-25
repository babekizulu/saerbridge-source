const { layoutFromRooms } = require('./layout');
const { takeoffFromLayout } = require('./quantities');
const { scheduleText } = require('./projectPlan');

const MIN_ROOM_WIDTH_MM = 1500;

function applyStructuredEdit(plan, operation, options = {}) {
    if (!operation || operation.operation !== 'resize_room') {
        return { ok: false, code: 'UNSUPPORTED_OPERATION', plan };
    }
    const delta = operation.deltaWidthMm;
    if (!Number.isInteger(delta) || delta % 100 !== 0 || delta === 0) {
        return { ok: false, code: 'GRID', plan };
    }
    if (!plan.geometry?.footprint || plan.geometry.status !== 'SOLVED') {
        return { ok: false, code: 'NO_FOOTPRINT', plan };
    }
    const rooms = plan.rooms.map((room) => ({ ...room }));
    const room = rooms.find((item) => item.id === operation.roomId);
    if (!room) return { ok: false, code: 'UNKNOWN_ROOM', plan };
    const partner = rooms.find((item) => item.id !== room.id && item.yMm === room.yMm);
    if (!partner) return { ok: false, code: 'NO_PARTNER', plan };
    if (room.widthMm + delta < MIN_ROOM_WIDTH_MM || partner.widthMm - delta < MIN_ROOM_WIDTH_MM) {
        return { ok: false, code: 'MINIMUM_WIDTH', plan };
    }
    room.widthMm += delta;
    partner.widthMm -= delta;
    if (room.xMm <= partner.xMm) partner.xMm = room.xMm + room.widthMm;
    else room.xMm = partner.xMm + partner.widthMm;
    const layout = layoutFromRooms(plan.geometry.footprint, rooms);
    if (!layout.reconciled) return { ok: false, code: 'NOT_RECONCILED', plan };
    const next = {
        ...plan,
        revision: plan.revision + 1,
        updatedAt: options.now || new Date().toISOString(),
        geometry: layout,
        rooms: layout.rooms,
        walls: layout.walls,
        openings: layout.openings,
        quantityTakeoff: takeoffFromLayout(layout, options.materialTypes || []),
        assumptions: layout.assumptions,
    };
    next.scheduleText = scheduleText(next);
    return { ok: true, plan: next };
}

module.exports = { applyStructuredEdit };
