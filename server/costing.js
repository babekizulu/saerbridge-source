/**
 * Quantity formulas (planning allowances, not a bill of quantities):
 * floorArea = width * length, or the supplied desired area when both spans are absent.
 * perimeter = 2 * (width + length). If only an area is known, side = sqrt(area)
 * and perimeter = 4 * side.
 * wallHeight is assumed at 2.4 m.
 * wallArea = perimeter * wallHeight * 0.85, allowing about 15% for openings.
 * roofArea = floorArea * 1.15, allowing a simple overhang.
 *
 * Money is calculated here. Model output never supplies totals.
 * low quantity = central * 0.85
 * high quantity = central * 1.25
 * contingency = 12% of the known central material subtotal
 * low total = low material subtotal + 12%
 * high total = high material subtotal + 12%
 * Listed prices are used as given. VAT is not added again.
 */

const WALL_HEIGHT_M = 2.4;
const OPENING_FACTOR = 0.85;
const ROOF_FACTOR = 1.15;
const LOW_FACTOR = 0.85;
const HIGH_FACTOR = 1.25;
const CONTINGENCY_PERCENT = 12;

const QUANTITY_RULES = {
    concrete: (metrics) => ({ quantity: round(metrics.floorArea * 0.1, 2), unit: 'm3' }),
    brick: (metrics) => ({ quantity: Math.ceil(metrics.wallArea * 52), unit: 'bricks' }),
    stone: (metrics) => ({ quantity: Math.ceil(metrics.wallArea * 12), unit: 'blocks' }),
    metal: (metrics) => ({ quantity: Math.ceil(metrics.roofArea / 2.1), unit: 'sheets' }),
    timber: (metrics) => ({ quantity: Math.ceil(metrics.perimeter / 3), unit: 'lengths' }),
    insulation: (metrics) => ({ quantity: round(metrics.roofArea, 1), unit: 'm2' }),
    paint: (metrics) => ({ quantity: round(metrics.wallArea * 0.2, 1), unit: 'litres' }),
    glass: (metrics) => ({ quantity: round(Math.max(1, metrics.floorArea * 0.12), 1), unit: 'm2' }),
    door: () => ({ quantity: 1, unit: 'each' }),
    window: () => ({ quantity: 2, unit: 'each' }),
    piping: (metrics) => ({ quantity: round(Math.max(6, metrics.perimeter * 0.5), 1), unit: 'm' }),
    wiring: (metrics) => ({ quantity: round(Math.max(10, metrics.floorArea * 0.8), 1), unit: 'm' }),
    sand: (metrics) => ({ quantity: round(metrics.floorArea * 0.05, 2), unit: 'm3' }),
    gravel: (metrics) => ({ quantity: round(metrics.floorArea * 0.08, 2), unit: 'm3' }),
    clay: (metrics) => ({ quantity: round(metrics.floorArea * 0.04, 2), unit: 'm3' }),
    plaster: (metrics) => ({ quantity: round(metrics.wallArea * 0.015, 2), unit: 'm3' }),
    cement: () => ({ quantity: 10, unit: 'bags' }),
};

const RULE_ALIAS = {
    'concrete-block': 'concrete',
    'aac-block': 'brick',
    'clay-brick': 'brick',
    'concrete-brick': 'brick',
    'corrugated-roofing': 'metal',
    'corrugated-metal-sheet': 'metal',
    'metal-sheet': 'metal',
    'metal-roofing': 'metal',
    'ibr-roofing': 'metal',
    'insulation-roll': 'insulation',
    'insulation-board': 'insulation',
    'glass-pane': 'glass',
    'timber-door': 'door',
    'steel-door': 'door',
    'sliding-door': 'door',
    'aluminium-window': 'window',
    'timber-window': 'window',
    'steel-window': 'window',
    'pvc-pipe': 'piping',
    'copper-pipe': 'piping',
    'electrical-cable': 'wiring',
    'river-sand': 'sand',
    'building-sand': 'sand',
    'crushed-stone': 'gravel',
};

function ruleKey(type) {
    if (QUANTITY_RULES[type]) return type;
    return RULE_ALIAS[type];
}

const CATEGORY_BY_TYPE = {
    concrete: 'Foundation / ground preparation',
    sand: 'Foundation / ground preparation',
    gravel: 'Foundation / ground preparation',
    clay: 'Foundation / ground preparation',
    brick: 'Walls',
    stone: 'Walls',
    plaster: 'Walls',
    metal: 'Roofing',
    timber: 'Structural materials',
    insulation: 'Insulation',
    glass: 'Doors and windows',
    door: 'Doors and windows',
    window: 'Doors and windows',
    paint: 'Paint / finishes',
    piping: 'Plumbing',
    wiring: 'Electrical',
    cement: 'Structural materials',
};

function round(value, digits) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function money(value) {
    return round(value, 2);
}

function metricsFromProperty(property) {
    if (!property) return null;
    const width = property.widthM;
    const length = property.lengthM;
    if (typeof width === 'number' && typeof length === 'number' && width > 0 && length > 0) {
        const floorArea = width * length;
        const perimeter = 2 * (width + length);
        return finishMetrics(floorArea, perimeter, 'width and length');
    }
    if (typeof property.desiredFloorAreaM2 === 'number' && property.desiredFloorAreaM2 > 0) {
        const floorArea = property.desiredFloorAreaM2;
        const side = Math.sqrt(floorArea);
        return finishMetrics(floorArea, 4 * side, 'desired floor area');
    }
    return null;
}

function finishMetrics(floorArea, perimeter, source) {
    const wallArea = perimeter * WALL_HEIGHT_M * OPENING_FACTOR;
    const roofArea = floorArea * ROOF_FACTOR;
    return {
        floorArea: round(floorArea, 2),
        perimeter: round(perimeter, 2),
        wallArea: round(wallArea, 2),
        roofArea: round(roofArea, 2),
        source,
    };
}

function countByType(items) {
    const counts = new Map();
    items.forEach((item) => {
        counts.set(item.type, (counts.get(item.type) || 0) + 1);
    });
    return counts;
}

function offerFor(type, suppliers) {
    for (const supplier of suppliers) {
        const offer = (supplier.offers || []).find((entry) => (
            entry.materialType === type && typeof entry.priceZAR === 'number'
        ));
        if (offer) {
            return { supplier, offer };
        }
    }
    const named = suppliers.find((supplier) => (
        (supplier.materialCategories || []).some((category) => category.toLowerCase().includes(type))
    ));
    return named ? { supplier: named, offer: null } : { supplier: null, offer: null };
}

function confidenceFor(offer) {
    if (!offer || typeof offer.priceZAR !== 'number') return 'unknown';
    if (offer.priceType === 'listed-current') return 'verified-listed';
    if (offer.priceType === 'listed-undated') return 'listed-undated';
    if (offer.priceType === 'estimated') return 'estimated';
    return 'unknown';
}

function lineForMaterial(item, count, metrics, suppliers) {
    const key = ruleKey(item.type);
    const rule = key ? QUANTITY_RULES[key] : undefined;
    const measured = metrics && rule ? rule(metrics) : null;
    const quantity = measured ? round(measured.quantity * Math.max(count, 1), 2) : undefined;
    const unit = measured ? measured.unit : undefined;
    const { supplier, offer } = offerFor(item.type, suppliers);
    const unitPrice = offer && typeof offer.priceZAR === 'number' ? money(offer.priceZAR) : undefined;
    const quantityCost = quantity != null && unitPrice != null
        ? money(quantity * unitPrice)
        : undefined;
    return {
        category: (key && CATEGORY_BY_TYPE[key]) || 'Materials',
        materialType: item.type,
        description: item.label,
        quantity,
        unit,
        unitPriceZAR: unitPrice,
        quantityCostZAR: quantityCost,
        supplierId: supplier ? supplier.id : undefined,
        supplierName: supplier ? supplier.name : undefined,
        priceConfidence: confidenceFor(offer),
        assumptions: measured
            ? `Planning allowance from ${metrics.source}. Not a surveyed quantity.`
            : 'Quantity omitted because property measurements were not provided.',
    };
}

function lineForFurniture(item) {
    return {
        category: 'Furniture',
        materialType: item.type,
        description: item.label,
        quantity: 1,
        unit: 'each',
        priceConfidence: 'unknown',
        assumptions: 'Furniture is listed for the concept. A price is not included unless a sourced offer exists.',
    };
}

function buildCostAnalysis({ materials, furniture, property, suppliers }) {
    const metrics = metricsFromProperty(property);
    const materialCounts = countByType(materials);
    const seen = new Set();
    const lines = [];

    materials.forEach((item) => {
        if (seen.has(item.type)) return;
        seen.add(item.type);
        lines.push(lineForMaterial(item, materialCounts.get(item.type) || 1, metrics, suppliers));
    });
    furniture.forEach((item) => {
        lines.push(lineForFurniture(item));
    });

    const known = lines.filter((line) => typeof line.quantityCostZAR === 'number');
    const materialsSubtotalZAR = known.length
        ? money(known.reduce((sum, line) => sum + line.quantityCostZAR, 0))
        : undefined;
    const contingencyZAR = materialsSubtotalZAR == null
        ? undefined
        : money(materialsSubtotalZAR * (CONTINGENCY_PERCENT / 100));
    const estimatedTotalZAR = materialsSubtotalZAR == null
        ? undefined
        : money(materialsSubtotalZAR + contingencyZAR);

    let lowEstimateZAR;
    let highEstimateZAR;
    if (estimatedTotalZAR != null) {
        lowEstimateZAR = money(estimatedTotalZAR * LOW_FACTOR);
        highEstimateZAR = money(estimatedTotalZAR * HIGH_FACTOR);
    }

    const assumptions = [
        'Approximate planning estimate. Not a final construction cost or a supplier quotation.',
        'Prices are indicative planning information. Confirm availability, delivery, and store prices before buying.',
        'Listed prices are used as published. VAT is not added a second time.',
        'Delivery cost is unknown unless a supplier states it, and it is not invented here.',
        'Structural member sizes, foundations, roofs, electricity, gas, and sanitation need a qualified local professional.',
        'Local building requirements and approvals must be checked before construction.',
    ];
    if (!metrics) {
        assumptions.unshift('Property measurements were not provided, so material quantities and a project total are not calculated.');
    } else {
        assumptions.unshift(
            `Floor area used for planning: ${metrics.floorArea} m2 from ${metrics.source}. Wall height is assumed at ${WALL_HEIGHT_M} m.`,
        );
    }
    if (known.length === 0) {
        assumptions.push('No verified unit prices were available, so the estimate does not invent a rand total.');
    }

    return {
        lines,
        materialsSubtotalZAR,
        deliveryEstimateZAR: undefined,
        contingencyPercent: materialsSubtotalZAR == null ? undefined : CONTINGENCY_PERCENT,
        contingencyZAR,
        estimatedTotalZAR,
        lowEstimateZAR,
        highEstimateZAR,
        assumptions,
        metrics,
    };
}

function savingSuggestions({ renovation, metrics, lines }) {
    const suggestions = [];
    if (!metrics) {
        suggestions.push({
            title: 'Add approximate dimensions',
            reason: 'Width and length let the estimate calculate floor, wall, and roof allowances instead of leaving quantities blank.',
        });
    }
    const suppliers = new Set(lines.map((line) => line.supplierName).filter(Boolean));
    if (suppliers.size > 1) {
        suggestions.push({
            title: 'Ask one merchant for the full list',
            reason: 'More than one supplier is listed. A single order can reduce separate trips when the materials are stocked together. An exact delivery saving is not calculated.',
        });
    }
    if (renovation) {
        suggestions.push({
            title: 'Retain sound existing parts',
            reason: 'A usable door, window, or roof sheet that is still sound avoids buying a replacement. Do not reuse structural pieces that are damaged or unverified.',
        });
    }
    suggestions.push({
        title: 'Use standard material sizes',
        reason: 'Standard sheets, blocks, and windows reduce offcuts. This is a qualitative benefit, not a calculated rand saving.',
    });
    suggestions.push({
        title: 'Phase non-essential finishes',
        reason: 'Weather protection, drainage, ventilation, and safe access come before decorative finishes.',
    });
    if (lines.some((line) => line.category !== 'Furniture' && line.priceConfidence === 'unknown')) {
        suggestions.push({
            title: 'Treat missing prices as quotes',
            reason: 'Where no listed price was found, the total does not invent one. Ask the supplier for a current price before relying on the estimate.',
        });
    }
    return suggestions.slice(0, 6);
}

module.exports = {
    buildCostAnalysis,
    savingSuggestions,
    metricsFromProperty,
    money,
};
