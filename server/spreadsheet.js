function safeText(value) {
    if (value == null) return '';
    const text = String(value);
    return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function moneyCell(value) {
    return typeof value === 'number' ? value : null;
}

function csvField(value) {
    if (value == null || value === '') return '';
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    const text = safeText(value);
    if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
}

function csvRow(cells) {
    return cells.map(csvField).join(',');
}

async function buildSpreadsheet({ renovation, area, property, cost, suppliers, generatedAt }) {
    const rows = [
        ['Project Summary'],
        ['Project type', renovation ? 'Renovation concept' : 'New home concept'],
        ['Location area', area || 'Not provided'],
        ['Approximate width (m)', property?.widthM ?? ''],
        ['Approximate length (m)', property?.lengthM ?? ''],
        ['Desired floor area (m2)', property?.desiredFloorAreaM2 ?? ''],
        ['Estimate date', generatedAt.slice(0, 10)],
        ['Estimated low cost (ZAR)', moneyCell(cost.lowEstimateZAR)],
        ['Estimated central cost (ZAR)', moneyCell(cost.estimatedTotalZAR)],
        ['Estimated high cost (ZAR)', moneyCell(cost.highEstimateZAR)],
        ['Contingency percent', cost.contingencyPercent ?? ''],
        ['Contingency (ZAR)', moneyCell(cost.contingencyZAR)],
        ['Disclaimer', 'Approximate planning estimate. Not a final construction cost, supplier quotation, survey, or approval.'],
        [],
        ['Material Costs'],
        [
            'Category',
            'Material',
            'Description',
            'Quantity',
            'Unit',
            'Unit Price (ZAR)',
            'Subtotal (ZAR)',
            'Supplier',
            'Price Confidence',
            'Notes',
        ],
    ];

    (cost.lines || []).forEach((line) => {
        rows.push([
            line.category,
            line.materialType,
            line.description,
            line.quantity ?? null,
            line.unit || '',
            moneyCell(line.unitPriceZAR),
            moneyCell(line.quantityCostZAR),
            line.supplierName || '',
            line.priceConfidence,
            line.assumptions || '',
        ]);
    });
    if ((cost.lines || []).length > 0) {
        rows.push([
            'Known material subtotal',
            '',
            '',
            '',
            '',
            '',
            moneyCell(cost.materialsSubtotalZAR),
            '',
            '',
            'Subtotal includes only lines with both a quantity and a unit price.',
        ]);
    }

    rows.push([]);
    rows.push(['Suppliers']);
    rows.push([
        'Supplier',
        'Address',
        'Materials',
        'Website',
        'Delivery',
        'Price Status',
        'Source',
        'Checked Date',
    ]);
    (suppliers || []).forEach((supplier) => {
        const priced = (supplier.offers || []).some((offer) => typeof offer.priceZAR === 'number');
        const delivery = supplier.deliveryAvailable == null
            ? 'Unknown'
            : supplier.deliveryAvailable
                ? (supplier.deliveryNotes || 'Delivery mentioned')
                : 'Not stated';
        rows.push([
            supplier.name,
            [supplier.address, supplier.suburb, supplier.city].filter(Boolean).join(', '),
            (supplier.materialCategories || []).join(', '),
            supplier.website || '',
            delivery,
            priced ? 'Listed or estimated price captured' : 'Contact supplier for price',
            supplier.sourceUrl,
            supplier.checkedAt ? supplier.checkedAt.slice(0, 10) : '',
        ]);
    });

    rows.push([]);
    rows.push(['Assumptions and limitations']);
    (cost.assumptions || []).forEach((line) => rows.push([line]));

    const csv = `\uFEFF${rows.map(csvRow).join('\r\n')}\r\n`;
    return Buffer.from(csv, 'utf8').toString('base64');
}

module.exports = { buildSpreadsheet };
