const path = require('node:path');
const repo = path.resolve(__dirname, '../..');
const { buildProjectPlan } = require(path.join(repo, 'server/domain/projectPlan'));
const { blueprintSvg, blueprintDxf } = require(path.join(repo, 'server/domain/drawings'));
const { compileScene } = require(path.join(repo, 'server/domain/scene'));
const { buildSpreadsheet } = require(path.join(repo, 'server/spreadsheet'));
const { generateKeyPairSync } = require('node:crypto');
exports.repo = repo;
exports.fixture = async () => {
    const plan = buildProjectPlan({
        projectId: 'responsive-fixture',
        createdAt: '2026-09-23T10:00:00.000Z',
        property: { widthM: 10, lengthM: 15, desiredFloorAreaM2: 36 },
        materials: [
            { type: 'concrete-block', label: 'Concrete block' },
            { type: 'concrete', label: 'Concrete' },
        ],
    });
    plan.conceptName = 'Courtyard home — a carefully planned family renovation';
    const cost = {
        lines: Array.from({ length: 45 }, (_, i) => ({
            category: 'Structural materials',
            materialType: `cement-${i}`,
            description:
                i === 1
                    ? '+Formula safety fixture'
                    : `Cement and long material description ${i + 1}`,
            quantity: 10,
            unit: 'bags',
            unitPriceZAR: 99.5,
            quantityCostZAR: 995,
            supplierName: 'Example supplier with a deliberately long name',
            priceConfidence: 'estimated',
            assumptions: 'Planning allowance; professional review required.',
        })),
        materialsSubtotalZAR: 44775,
        contingencyZAR: 5373,
        estimatedTotalZAR: 50148,
        lowEstimateZAR: 42625.8,
        highEstimateZAR: 62685,
        assumptions: ['Delivery is unknown. This estimate excludes labour and professional fees.'],
    };
    const suppliers = [
        {
            id: 'example',
            name: 'Example supplier with a deliberately long name',
            address: 'Example street',
            city: 'Johannesburg',
            latitude: -26.2,
            longitude: 28.04,
            website: 'https://example.test/' + 'long-name-'.repeat(20),
            sourceUrl: 'https://example.test/',
            checkedAt: '2026-09-23T10:00:00.000Z',
            materialCategories: ['Cement'],
            offers: [],
            confidence: 'low',
        },
    ];
    const { PDFDocument } = require(path.join(repo, 'server/node_modules/pdf-lib'));
    const pdf = await PDFDocument.create();
    pdf.addPage([300, 400]).drawText('Responsive fixture report');
    return {
        image: `data:image/svg+xml,${encodeURIComponent(blueprintSvg(plan))}`,
        pdf: Buffer.from(await pdf.save()).toString('base64'),
        projectPlan: { ...plan, footprint: plan.geometry.footprint },
        sceneSpec: compileScene(plan),
        blueprintSvg: blueprintSvg(plan),
        blueprintDxf: blueprintDxf(plan),
        costAnalysis: cost,
        spreadsheet: await buildSpreadsheet({
            renovation: false,
            area: 'Johannesburg',
            property: null,
            cost,
            suppliers,
            generatedAt: '2026-09-23T10:00:00.000Z',
        }),
        spreadsheetStatus: 'ok',
        pdfStatus: 'ok',
        suppliers,
        supplierStatus: 'ok',
        emailDelivery: { available: false },
        spaceTally: { rooms: 4, bathrooms: 1, kitchens: 1, garages: 0, source: 'plan' },
    };
};
exports.mock = async (page, response) => {
    const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const state = { requests: 0 };
    await page.route(
        (url) => url.pathname.startsWith('/api/'),
        async (route) => {
            if (route.request().url().endsWith('/api/crypto/public-key'))
                return route.fulfill({
                    json: {
                        version: 1,
                        algorithm: 'RSA-OAEP-256+AES-256-GCM',
                        keyId: 'test',
                        publicKey: keys.publicKey
                            .export({ type: 'spki', format: 'der' })
                            .toString('base64'),
                    },
                });
            if (route.request().url().endsWith('/api/home-design')) {
                state.requests++;
                const value = typeof response === 'function' ? await response(route) : response;
                return route.fulfill(value.error ? { status: 500, json: value } : { json: value });
            }
            return route.abort();
        }
    );
    await page.route('**/*.tile.openstreetmap.org/**', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'image/png',
            body: Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2i8AAAAASUVORK5CYII=',
                'base64'
            ),
        })
    );
    return state;
};
