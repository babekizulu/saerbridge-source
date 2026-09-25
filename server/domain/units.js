const GRID_MM = 100;

function mToMm(metres) {
    if (typeof metres !== 'number' || !Number.isFinite(metres) || metres <= 0) return null;
    return Math.round(metres * 1000);
}

function mmToM(mm) {
    return mm / 1000;
}

function areaMm2ToM2(areaMm2) {
    return areaMm2 / 1_000_000;
}

function lengthMm(start, end) {
    const dx = end.xMm - start.xMm;
    const dy = end.yMm - start.yMm;
    return Math.round(Math.hypot(dx, dy));
}

function rectAreaMm2(widthMm, lengthMmValue) {
    return widthMm * lengthMmValue;
}

function snapDown(mm) {
    return Math.floor(mm / GRID_MM) * GRID_MM;
}

function allocateMm(totalMm, weights) {
    const safe = weights.map((weight) => (weight > 0 ? weight : 0));
    const sum = safe.reduce((total, weight) => total + weight, 0);
    if (sum <= 0 || totalMm <= 0) return safe.map(() => 0);
    const raw = safe.map((weight) => snapDown((totalMm * weight) / sum));
    let used = raw.reduce((total, value) => total + value, 0);
    let index = 0;
    while (used + GRID_MM <= totalMm && raw.length > 0) {
        raw[index % raw.length] += GRID_MM;
        used += GRID_MM;
        index += 1;
        if (index > raw.length * 10000) break;
    }
    return raw;
}

module.exports = {
    GRID_MM,
    mToMm,
    mmToM,
    areaMm2ToM2,
    lengthMm,
    rectAreaMm2,
    allocateMm,
};
