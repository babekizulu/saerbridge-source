const { buildProjectPlan } = require('./projectPlan');
const { compileScene } = require('./scene');
const { blueprintSvg, blueprintDxf } = require('./drawings');
const { csvFromPlan, costFromPlan } = require('./exports');
const { buildPdf, createConceptImage, createInstructions, textModels, openai } = require('../design');
const { researchSuppliers } = require('../research');
const { geocodeAddress, reverseArea } = require('../geocode');

function report(input, step, state) {
    if (typeof input.onProgress === 'function') input.onProgress({ step, state });
}

function publicPlan(plan) {
    return {
        projectId: plan.projectId,
        conceptName: plan.conceptName || '',
        revision: plan.revision,
        schemaVersion: plan.schemaVersion,
        geometryRuleVersion: plan.geometryRuleVersion,
        quantityRuleVersion: plan.quantityRuleVersion,
        costingRuleVersion: plan.costingRuleVersion,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        outputStatus: plan.outputStatus,
        scheduleText: plan.scheduleText,
        site: plan.site,
        footprint: plan.geometry?.footprint || null,
        rooms: plan.rooms.map((room) => ({
            id: room.id,
            type: room.type,
            name: room.name,
            widthMm: room.widthMm,
            lengthMm: room.lengthMm,
            areaMm2: room.areaMm2,
        })),
        openings: plan.openings.map((opening) => ({
            id: opening.id,
            kind: opening.kind,
            wallId: opening.wallId,
            widthMm: opening.widthMm,
            heightMm: opening.heightMm,
        })),
        quantityTakeoff: plan.quantityTakeoff.map((item) => ({
            itemId: item.itemId,
            assemblyId: item.assemblyId,
            description: item.description,
            specification: item.specification,
            requiredQuantity: item.requiredQuantity,
            requiredUnit: item.requiredUnit,
            purchaseQuantity: item.purchaseQuantity,
            packsToBuy: item.packsToBuy,
            packSize: item.packSize,
            equationDescription: item.equationDescription,
            inputs: item.inputs,
            priceStatus: item.priceStatus,
            quantityStatus: item.quantityStatus,
            provenance: item.provenance,
        })),
        affordability: plan.affordability,
        assumptions: plan.assumptions,
        professionalReview: plan.professionalReview,
    };
}

function spaceTallyFromPlan(plan) {
    return {
        rooms: plan.rooms.filter((room) => room.type === 'sleeping').length,
        bathrooms: plan.rooms.filter((room) => room.type === 'bathroom').length,
        kitchens: plan.rooms.filter((room) => room.type === 'kitchen').length,
        garages: 0,
        source: 'plan',
    };
}

async function resolveArea(location) {
    if (!location) return '';
    if (location.area) return location.area;
    if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
        try {
            return await reverseArea(location.latitude, location.longitude) || '';
        } catch {
            return '';
        }
    }
    return '';
}

async function createGeometricProject(input) {
    report(input, 'requirements', 'active');
    const plan = buildProjectPlan({
        property: input.property,
        materials: input.materials,
        projectId: input.projectId,
        conceptName: input.conceptName,
        createdAt: new Date().toISOString(),
    });
    report(input, 'requirements', 'done');
    report(input, 'geometry', plan.outputStatus === 'GEOMETRY_READY' ? 'done' : 'failed');
    report(input, 'quantities', plan.quantityTakeoff.length ? 'done' : 'skipped');
    report(input, 'blueprint', 'active');
    const svg = blueprintSvg(plan);
    const dxf = blueprintDxf(plan);
    const sceneSpec = compileScene(plan, {
        materialTypes: (input.materials || []).map((item) => item.type),
        furniture: input.furniture || [],
    });
    report(input, 'blueprint', 'done');
    const cost = costFromPlan(plan);
    report(input, 'cost', 'done');

    const imageTask = plan.outputStatus === 'GEOMETRY_READY'
        ? createConceptImage(input.materials, input.furniture, input.property, input.residence, plan.scheduleText)
            .then((value) => {
                report(input, 'visualisation', 'done');
                return value;
            })
            .catch((error) => {
                console.error(`Visualisation failed: ${error.message || 'image request failed'}`);
                report(input, 'visualisation', 'failed');
                return '';
            })
        : Promise.resolve('');
    if (plan.outputStatus === 'GEOMETRY_READY') report(input, 'visualisation', 'active');
    else report(input, 'visualisation', 'skipped');

    const area = await resolveArea(input.location);
    let suppliers = [];
    let supplierStatus = 'skipped';
    if (area) {
        report(input, 'suppliers', 'active');
        try {
            const research = await researchSuppliers({
                area,
                materials: input.materials,
                client: openai(),
                models: textModels(),
            });
            suppliers = research.suppliers || [];
            supplierStatus = research.status === 'unavailable' ? 'unavailable' : 'ok';
            for (const supplier of suppliers) {
                if (suppliers.filter((item) => item.latitude != null).length >= 6) break;
                const query = [supplier.address, supplier.suburb, supplier.city, 'South Africa'].filter(Boolean).join(', ');
                if (!query) continue;
                try {
                    const point = await geocodeAddress(query);
                    if (point) {
                        supplier.latitude = point.latitude;
                        supplier.longitude = point.longitude;
                    }
                } catch {
                    // A missing map pin does not change the plan.
                }
            }
            report(input, 'suppliers', supplierStatus === 'unavailable' ? 'failed' : 'done');
        } catch {
            supplierStatus = 'unavailable';
            report(input, 'suppliers', 'failed');
        }
    } else {
        report(input, 'suppliers', 'skipped');
    }

    let instructions = {
        summary: plan.scheduleText,
        sections: [{
            heading: 'Authoritative floor plan',
            body: plan.scheduleText,
        }],
    };
    try {
        const written = await createInstructions(input.materials, input.furniture, input.property, {
            renovation: false,
            area,
            residence: input.residence,
        });
        written.sections = [{
            heading: 'Authoritative floor plan',
            body: plan.scheduleText,
        }, ...written.sections];
        instructions = written;
    } catch {
        // The plan text remains the authoritative section.
    }

    report(input, 'pdf', 'active');
    report(input, 'spreadsheet', 'active');
    let pdf = '';
    let spreadsheet = '';
    try {
        pdf = await buildPdf({
            materials: input.materials,
            furniture: input.furniture,
            instructions,
            property: input.property,
            context: {
                renovation: false,
                area,
                cost,
                automatic: input.materials.length === 0,
                plan: {
                    projectId: plan.projectId,
                    revision: plan.revision,
                    footprint: plan.geometry?.footprint || null,
                    rooms: plan.rooms,
                },
            },
        });
    } catch {
        pdf = '';
    }
    try {
        spreadsheet = await csvFromPlan(plan);
    } catch {
        spreadsheet = '';
    }
    report(input, 'pdf', pdf ? 'done' : 'failed');
    report(input, 'spreadsheet', spreadsheet ? 'done' : 'failed');

    const image = await imageTask;

    return {
        image,
        pdf,
        spreadsheet,
        blueprintSvg: svg,
        blueprintDxf: dxf,
        sceneSpec,
        projectPlan: publicPlan(plan),
        visualisationStatus: plan.outputStatus === 'GEOMETRY_READY' ? (image ? 'ready' : 'failed') : 'skipped',
        costAnalysis: cost,
        suppliers,
        savings: [],
        suggestedMaterials: [],
        spaceTally: spaceTallyFromPlan(plan),
        supplierStatus,
        spreadsheetStatus: spreadsheet ? 'ok' : 'unavailable',
        pdfStatus: pdf ? 'ok' : 'unavailable',
        projectSummary: {
            renovationMode: false,
            geometric: true,
            projectId: plan.projectId,
            revision: plan.revision,
        },
    };
}

module.exports = { createGeometricProject };
