const { ROOF_OVERHANG_MM, ROOF_PITCH_DEGREES } = require('./layout');

const BLOCK_FACE_MM2 = 400 * 200;
const SHEET_COVER_MM = 762;
const SHEET_LENGTH_MM = 3600;
const SHEET_PACK_SIZE = 10;
const WASTE_BLOCKS = 0.05;

function packsFor(required, packSize) {
    if (typeof required !== 'number' || required < 0) {
        return { status: 'SPECIFICATION_REQUIRED', requiredQuantity: required, purchaseQuantity: null, packSize };
    }
    if (typeof packSize !== 'number' || packSize < 1) {
        return { status: 'SPECIFICATION_REQUIRED', requiredQuantity: required, purchaseQuantity: null, packSize: null };
    }
    return {
        status: 'CALCULATED',
        requiredQuantity: required,
        packSize,
        purchaseQuantity: Math.ceil(required / packSize),
    };
}

function roofPlanes(footprint) {
    const pitchRadians = (ROOF_PITCH_DEGREES * Math.PI) / 180;
    const runMm = Math.round(footprint.widthMm / 2) + ROOF_OVERHANG_MM;
    const slopeMm = Math.round(runMm / Math.cos(pitchRadians));
    const ridgeMm = footprint.lengthMm + (ROOF_OVERHANG_MM * 2);
    const planeAreaMm2 = slopeMm * ridgeMm;
    return {
        count: 2,
        slopeMm,
        ridgeMm,
        planeAreaMm2,
        totalAreaMm2: planeAreaMm2 * 2,
        pitchDegrees: ROOF_PITCH_DEGREES,
        overhangMm: ROOF_OVERHANG_MM,
    };
}

function sheetCount(planes) {
    const across = Math.ceil(planes.ridgeMm / SHEET_COVER_MM);
    const along = Math.ceil(planes.slopeMm / SHEET_LENGTH_MM);
    return across * along * planes.count;
}

function takeoffFromLayout(layout, selectedTypes) {
    const selected = new Set(selectedTypes || []);
    const lines = [];
    if (layout.status !== 'SOLVED') return lines;
    const openingsByWall = new Map();
    layout.openings.forEach((opening) => {
        const list = openingsByWall.get(opening.wallId) || [];
        list.push(opening);
        openingsByWall.set(opening.wallId, list);
    });

    const exterior = layout.walls.filter((wall) => wall.exterior);
    let grossWallMm2 = 0;
    let openingMm2 = 0;
    exterior.forEach((wall) => {
        const gross = wall.lengthMm * wall.heightMm;
        grossWallMm2 += gross;
        (openingsByWall.get(wall.id) || []).forEach((opening) => {
            openingMm2 += opening.areaMm2;
        });
    });
    const netWallMm2 = grossWallMm2 - openingMm2;
    const netBlocks = Math.ceil(netWallMm2 / BLOCK_FACE_MM2);
    const blocksWithWaste = Math.ceil(netBlocks * (1 + WASTE_BLOCKS));
    const masonrySelected = ['concrete-block', 'aac-block', 'clay-brick', 'concrete-brick'].filter((type) => selected.has(type));
    const masonryType = masonrySelected[0] || 'concrete-block';
    lines.push({
        itemId: masonryType,
        assemblyId: 'block-wall',
        formulaId: 'masonry-face-area-v1',
        formulaVersion: '1',
        category: 'Walls',
        description: masonryType === 'concrete-block' ? 'Concrete block' : masonryType,
        specification: '390 x 190 x 140 mm block, 10 mm joints, 400 x 200 mm effective face. Not poured concrete.',
        requiredQuantity: blocksWithWaste,
        requiredUnit: 'each',
        netQuantity: netBlocks,
        wasteAllowance: WASTE_BLOCKS,
        purchaseQuantity: blocksWithWaste,
        sellingUnit: 'each',
        packSize: 1,
        packsToBuy: blocksWithWaste,
        mandatory: true,
        priceStatus: 'QUOTE_REQUIRED',
        quantityStatus: 'CALCULATED',
        provenance: masonrySelected.length ? 'USER_PROVIDED' : 'ASSUMED',
        inputs: {
            grossWallMm2,
            openingMm2,
            netWallMm2,
            blockFaceMm2: BLOCK_FACE_MM2,
        },
        equationDescription: 'Purchase blocks = ceil(ceil(net wall area / effective face area) x 1.05).',
        assumptions: masonrySelected.length > 1
            ? 'Only one masonry assembly is applied to the exterior walls so the wall is not counted twice.'
            : 'Exterior walls use a concrete-block assembly unless another single masonry type was selected.',
        duplicateIgnored: masonrySelected.slice(1),
    });

    if (selected.has('concrete') || selected.has('precast-concrete')) {
        const thicknessMm = 100;
        const volumeM3 = (layout.footprint.areaMm2 * thicknessMm) / 1_000_000_000;
        lines.push({
            itemId: 'concrete-slab',
            assemblyId: 'concrete-slab',
            formulaId: 'slab-volume-v1',
            formulaVersion: '1',
            category: 'Floors',
            description: 'Concrete slab',
            specification: '100 mm planning thickness over the footprint. Not a foundation or footing design.',
            requiredQuantity: Math.round(volumeM3 * 100) / 100,
            requiredUnit: 'm3',
            netQuantity: Math.round(volumeM3 * 100) / 100,
            wasteAllowance: 0,
            purchaseQuantity: Math.round(volumeM3 * 100) / 100,
            sellingUnit: 'm3',
            packSize: null,
            packsToBuy: null,
            mandatory: true,
            priceStatus: 'QUOTE_REQUIRED',
            quantityStatus: 'CALCULATED',
            provenance: 'USER_PROVIDED',
            inputs: { areaMm2: layout.footprint.areaMm2, thicknessMm },
            equationDescription: 'Slab volume = footprint area x 100 mm. Foundation sizing is not calculated.',
            assumptions: 'PROFESSIONAL_REVIEW_REQUIRED for soil, reinforcement, and footing design.',
            status: 'PROFESSIONAL_REVIEW_REQUIRED',
        });
    }

    const roofTypes = ['corrugated-roofing', 'ibr-roofing', 'metal-roofing', 'corrugated-metal-sheet'].filter((type) => selected.has(type));
    const planes = roofPlanes(layout.footprint);
    const sheets = sheetCount(planes);
    const packed = packsFor(sheets, SHEET_PACK_SIZE);
    lines.push({
        itemId: roofTypes[0] || 'corrugated-roofing',
        assemblyId: 'corrugated-sheet-roof',
        formulaId: 'gable-sheet-count-v1',
        formulaVersion: '1',
        category: 'Roofing',
        description: 'Corrugated roof sheets',
        specification: `Effective cover ${SHEET_COVER_MM} mm, sheet length ${SHEET_LENGTH_MM} mm, pack of ${SHEET_PACK_SIZE}.`,
        requiredQuantity: sheets,
        requiredUnit: 'sheet',
        netQuantity: sheets,
        wasteAllowance: 0,
        purchaseQuantity: packed.purchaseQuantity * SHEET_PACK_SIZE,
        sellingUnit: 'pack',
        packSize: SHEET_PACK_SIZE,
        packsToBuy: packed.purchaseQuantity,
        mandatory: true,
        priceStatus: 'QUOTE_REQUIRED',
        quantityStatus: 'CALCULATED',
        provenance: roofTypes.length ? 'USER_PROVIDED' : 'ASSUMED',
        inputs: planes,
        equationDescription: 'Sheets cover both gable planes. Packs = ceil(sheets / sheets per pack). Screws and flashings are not omitted from the assembly, but their product specification is still required.',
        assumptions: roofTypes.length > 1
            ? 'A second roof covering was selected and was not applied again.'
            : 'One roof assembly covers the footprint. Support structure and flashings need product specifications before their quantities are final.',
        duplicateIgnored: roofTypes.slice(1),
        relatedUnspecified: ['ridge-flashing', 'roofing-screws', 'roof-structure'],
    });

    const windows = layout.openings.filter((opening) => opening.kind === 'window');
    const doors = layout.openings.filter((opening) => opening.kind === 'door');
    lines.push({
        itemId: 'window',
        assemblyId: 'window-opening',
        formulaId: 'opening-count-v1',
        formulaVersion: '1',
        category: 'Openings',
        description: 'Window',
        specification: '900 x 1200 mm planning opening',
        requiredQuantity: windows.length,
        requiredUnit: 'each',
        netQuantity: windows.length,
        wasteAllowance: 0,
        purchaseQuantity: windows.length,
        sellingUnit: 'each',
        packSize: 1,
        packsToBuy: windows.length,
        mandatory: true,
        priceStatus: 'QUOTE_REQUIRED',
        quantityStatus: 'CALCULATED',
        provenance: 'DERIVED',
        inputs: { openings: windows.map((opening) => opening.id) },
        equationDescription: 'One window for each suitable exterior wall that does not already contain the entrance door.',
        assumptions: 'Opening size is a planning allowance, not a manufactured window schedule approved for installation.',
    });
    lines.push({
        itemId: 'door',
        assemblyId: 'door-opening',
        formulaId: 'opening-count-v1',
        formulaVersion: '1',
        category: 'Openings',
        description: 'Door',
        specification: 'Exterior 900 x 2100 mm, internal 800 x 2100 mm',
        requiredQuantity: doors.length,
        requiredUnit: 'each',
        netQuantity: doors.length,
        wasteAllowance: 0,
        purchaseQuantity: doors.length,
        sellingUnit: 'each',
        packSize: 1,
        packsToBuy: doors.length,
        mandatory: true,
        priceStatus: 'QUOTE_REQUIRED',
        quantityStatus: 'CALCULATED',
        provenance: 'DERIVED',
        inputs: { openings: doors.map((opening) => opening.id) },
        equationDescription: 'Door count equals the doors placed on the plan.',
        assumptions: 'Door leaves and frames are not certified fire or security doors.',
    });
    return lines;
}

module.exports = {
    BLOCK_FACE_MM2,
    SHEET_PACK_SIZE,
    packsFor,
    roofPlanes,
    takeoffFromLayout,
};
