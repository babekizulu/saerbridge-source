const crypto = require('crypto');
const { mToMm, mmToM, areaMm2ToM2 } = require('./units');
const { solveLayout } = require('./layout');
const { takeoffFromLayout } = require('./quantities');

const SCHEMA_VERSION = '1.0.0';
const GEOMETRY_RULE_VERSION = 'orthogonal-grid-100-v1';
const QUANTITY_RULE_VERSION = 'assemblies-v1';
const COSTING_RULE_VERSION = 'cents-v1';

function assessAffordability(lines) {
    const mandatory = lines.filter((line) => line.mandatory);
    const unpriced = mandatory.filter((line) => line.priceStatus !== 'VERIFIED_LISTING' && line.priceStatus !== 'USER_QUOTE');
    return {
        status: 'CANNOT_ASSESS',
        pricedScopeSubtotalCents: null,
        unpricedMandatoryItems: unpriced.map((line) => line.itemId),
        completeCostIfKnownCents: null,
        budgetCents: null,
        differenceCents: null,
        reason: 'A complete delivered cost cannot be assessed while mandatory materials, labour, transport, or a confirmed budget are missing. No rand total is invented.',
    };
}

function scheduleText(plan) {
    if (!plan.geometry || plan.geometry.status !== 'SOLVED') {
        return 'No dwelling footprint was generated. Plot dimensions are not used as the building area.';
    }
    const footprint = plan.geometry.footprint;
    const lines = [
        `Project ${plan.conceptName || plan.projectId} revision ${plan.revision}.`,
        `Plot ${mmToM(plan.site.plotWidthMm)} m by ${mmToM(plan.site.plotLengthMm)} m, plot area ${areaMm2ToM2(plan.site.plotAreaMm2)} m2.`,
        `Dwelling footprint ${mmToM(footprint.widthMm)} m by ${mmToM(footprint.lengthMm)} m, ${areaMm2ToM2(footprint.areaMm2)} m2. Storeys: ${plan.site.storeys}.`,
        'Room schedule:',
        ...plan.rooms.map((room) => (
            `${room.name}: ${mmToM(room.widthMm)} m by ${mmToM(room.lengthMm)} m, ${areaMm2ToM2(room.areaMm2)} m2.`
        )),
        `Windows: ${plan.openings.filter((opening) => opening.kind === 'window').length}. Doors: ${plan.openings.filter((opening) => opening.kind === 'door').length}.`,
        'Dimensions are defined by this plan. A later visualisation is not a source of measurements.',
        'Foundation, reinforcement, truss, electrical, and sanitation design are PROFESSIONAL_REVIEW_REQUIRED.',
    ];
    return lines.join(' ');
}

function buildProjectPlan({
    property,
    materials,
    projectId,
    conceptName,
    createdAt,
}) {
    const now = createdAt || new Date().toISOString();
    const plotWidthMm = mToMm(property?.widthM) || 0;
    const plotLengthMm = mToMm(property?.lengthM) || 0;
    const targetAreaMm2 = mToMm(property?.desiredFloorAreaM2)
        ? mToMm(property.desiredFloorAreaM2) * 1000
        : 0;
    const layout = solveLayout({
        plotWidthMm: plotWidthMm || null,
        plotLengthMm: plotLengthMm || null,
        targetAreaMm2,
    });
    const selectedTypes = (materials || []).map((item) => item.type);
    const quantityTakeoff = takeoffFromLayout(layout, selectedTypes);
    const plan = {
        projectId: projectId || crypto.randomUUID(),
        conceptName: conceptName || '',
        revision: 1,
        schemaVersion: SCHEMA_VERSION,
        geometryRuleVersion: GEOMETRY_RULE_VERSION,
        quantityRuleVersion: QUANTITY_RULE_VERSION,
        costingRuleVersion: COSTING_RULE_VERSION,
        createdAt: now,
        updatedAt: now,
        outputStatus: layout.status === 'SOLVED' ? 'GEOMETRY_READY' : 'SPECIFICATION_REQUIRED',
        site: {
            plotWidthMm,
            plotLengthMm,
            plotAreaMm2: plotWidthMm && plotLengthMm ? plotWidthMm * plotLengthMm : 0,
            storeys: 1,
            desiredBuildingAreaMm2: targetAreaMm2,
        },
        geometry: layout,
        rooms: layout.rooms || [],
        walls: layout.walls || [],
        openings: layout.openings || [],
        quantityTakeoff,
        affordability: assessAffordability(quantityTakeoff),
        assumptions: layout.assumptions || [],
        professionalReview: [
            'Foundation and footing sizes',
            'Reinforcement and lintels',
            'Roof structure and truss engineering',
            'Electrical and sanitation design',
        ],
    };
    plan.scheduleText = scheduleText(plan);
    return plan;
}

module.exports = {
    SCHEMA_VERSION,
    buildProjectPlan,
    scheduleText,
    assessAffordability,
};
