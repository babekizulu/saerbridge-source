const { automaticMaterials } = require('./palette');
const { chooseSpaceTally } = require('./spaceTally');
const { buildCostAnalysis, savingSuggestions } = require('./costing');
const { geocodeAddress, reverseArea } = require('./geocode');
const { researchSuppliers } = require('./research');
const { buildSpreadsheet } = require('./spreadsheet');
const { createGeometricProject } = require('./domain/runPlan');
const {
    createConceptImage,
    createRenovationImage,
    createInstructions,
    buildPdf,
    textModels,
    openai,
} = require('./design');

function publicCost(cost) {
    const copy = { ...cost };
    delete copy.metrics;
    return copy;
}

async function resolveArea(location) {
    if (!location) return '';
    if (location.area) return location.area;
    if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
        const area = await reverseArea(location.latitude, location.longitude);
        return area || '';
    }
    return '';
}

async function attachCoordinates(suppliers) {
    const next = [];
    let lookedUp = 0;
    for (const supplier of suppliers) {
        const copy = { ...supplier };
        const query = [supplier.address, supplier.suburb, supplier.city, 'South Africa']
            .filter(Boolean)
            .join(', ');
        if (query && lookedUp < 6) {
            lookedUp += 1;
            const point = await geocodeAddress(query);
            if (point) {
                copy.latitude = point.latitude;
                copy.longitude = point.longitude;
            }
        }
        next.push(copy);
    }
    return next;
}

function report(input, step, state) {
    if (typeof input.onProgress === 'function') input.onProgress({ step, state });
}

async function createProject(input) {
    if (!input.photograph) {
        return createGeometricProject(input);
    }
    const started = Date.now();
    const requestId = input.requestId;
    const renovation = Boolean(input.photograph);
    const materials = input.materials.length ? input.materials : automaticMaterials();
    const automatic = input.materials.length === 0;
    const furniture = input.furniture;
    let area = '';
    try {
        area = await resolveArea(input.location);
    } catch {
        area = input.location?.area || '';
    }

    report(input, 'concept', 'active');
    report(input, 'guidance', 'active');
    if (!area) report(input, 'suppliers', 'skipped');

    const imageTask = (renovation
        ? createRenovationImage({
            photograph: input.photograph,
            materials,
            furniture,
            property: input.property,
            area,
            automatic,
            residence: input.residence,
        })
        : createConceptImage(materials, furniture, input.property, input.residence)
    ).then((value) => {
        report(input, 'concept', 'done');
        return value;
    }, (error) => {
        report(input, 'concept', 'failed');
        throw error;
    });

    const researchTask = area
        ? (async () => {
            report(input, 'suppliers', 'active');
            try {
                const value = await researchSuppliers({
                    area,
                    materials,
                    client: openai(),
                    models: textModels(),
                });
                if (value.status === 'unavailable') report(input, 'suppliers', 'failed');
                return value;
            } catch (error) {
                report(input, 'suppliers', 'failed');
                throw error;
            }
        })()
        : Promise.resolve({ suppliers: [], status: 'skipped' });

    const guidanceTask = createInstructions(materials, furniture, input.property, {
        renovation,
        area,
        automatic,
        residence: input.residence,
    }).then((value) => {
        report(input, 'guidance', 'done');
        return value;
    }, (error) => {
        report(input, 'guidance', 'failed');
        throw error;
    });

    const [imageResult, researchResult, guidanceResult] = await Promise.allSettled([
        imageTask,
        researchTask,
        guidanceTask,
    ]);

    if (imageResult.status !== 'fulfilled') {
        const error = imageResult.reason || new Error('Image generation failed');
        error.stage = 'image';
        throw error;
    }

    const research = researchResult.status === 'fulfilled'
        ? researchResult.value
        : { suppliers: [], status: 'unavailable' };
    let suppliers = research.suppliers || [];
    try {
        suppliers = await attachCoordinates(suppliers);
    } catch {
        suppliers = research.suppliers || [];
    }
    if (area && research.status !== 'unavailable' && researchResult.status === 'fulfilled') {
        report(input, 'suppliers', 'done');
    }

    report(input, 'cost', 'active');
    const cost = buildCostAnalysis({
        materials,
        furniture,
        property: input.property,
        suppliers,
    });
    const savings = savingSuggestions({
        renovation,
        metrics: cost.metrics,
        lines: cost.lines,
    });
    report(input, 'cost', 'done');
    report(input, 'pdf', 'active');
    report(input, 'spreadsheet', 'active');
    const instructions = guidanceResult.status === 'fulfilled'
        ? guidanceResult.value
        : {
            summary: 'Written guidance could not be prepared for this request. The concept image is still a design aid, not a construction document.',
            sections: [{
                heading: 'Important limitations',
                body: 'Local building requirements and approvals must be checked before construction. Structural, electrical, gas, and sanitation work needs a qualified local professional.',
            }],
        };

    const [pdfResult, sheetResult] = await Promise.allSettled([
        buildPdf({
            materials,
            furniture,
            instructions,
            property: input.property,
            context: {
                renovation,
                area,
                cost,
                automatic,
            },
        }),
        buildSpreadsheet({
            renovation,
            area,
            property: input.property,
            cost,
            suppliers,
            generatedAt: new Date().toISOString(),
        }),
    ]);

    const pdf = pdfResult.status === 'fulfilled' ? pdfResult.value : '';
    const spreadsheet = sheetResult.status === 'fulfilled' ? sheetResult.value : '';
    report(input, 'pdf', pdf ? 'done' : 'failed');
    report(input, 'spreadsheet', spreadsheet ? 'done' : 'failed');
    console.log(JSON.stringify({
        requestId,
        workflow: renovation ? 'renovation' : 'concept',
        durationMs: Date.now() - started,
        supplierStatus: research.status,
        supplierCount: suppliers.length,
        spreadsheet: Boolean(spreadsheet),
        pdf: Boolean(pdf),
        guidance: guidanceResult.status === 'fulfilled',
    }));

    return {
        image: imageResult.value,
        pdf,
        spreadsheet,
        costAnalysis: publicCost(cost),
        suppliers,
        savings,
        suggestedMaterials: automatic ? materials : [],
        spaceTally: chooseSpaceTally(furniture, instructions.spaceTally),
        supplierStatus: research.status,
        spreadsheetStatus: spreadsheet ? 'ok' : 'unavailable',
        pdfStatus: pdf ? 'ok' : 'unavailable',
        projectSummary: {
            selectedMaterialCount: input.materials.length,
            selectedFurnitureCount: furniture.length,
            renovationMode: renovation,
            automaticMaterials: automatic,
        },
    };
}

module.exports = { createProject };
