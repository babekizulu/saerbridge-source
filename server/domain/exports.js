function safeText(value) {
    if (value == null) return '';
    const text = String(value);
    return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvField(value) {
    if (value == null || value === '') return '';
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    const text = safeText(value);
    if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
}

function csvFromPlan(plan) {
    const header = [
        'project_id',
        'revision',
        'assembly_id',
        'item_id',
        'category',
        'description',
        'specification',
        'required_quantity',
        'required_unit',
        'waste_allowance',
        'purchase_quantity',
        'selling_unit',
        'pack_size',
        'packs_to_buy',
        'price_status',
        'quantity_status',
        'equation',
        'phase_id',
        'reuse_quantity',
        'unit_price_zar',
        'tax_basis',
        'line_total_zar',
        'supplier_id',
        'offer_id',
        'source_url',
        'checked_at',
        'exclusion_reason',
    ];
    const lines = [header];
    (plan.quantityTakeoff || []).forEach((item) => {
        lines.push([
            plan.projectId,
            plan.revision,
            item.assemblyId,
            item.itemId,
            item.category,
            item.description,
            item.specification,
            item.requiredQuantity,
            item.requiredUnit,
            item.wasteAllowance,
            item.purchaseQuantity,
            item.sellingUnit,
            item.packSize,
            item.packsToBuy,
            item.priceStatus,
            item.quantityStatus,
            item.equationDescription,
            item.phaseId || '',
            item.reusableQuantity ?? 0,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            item.exclusionReason || '',
        ]);
    });
    lines.push([]);
    lines.push(['schedule', plan.scheduleText]);
    const csv = `\uFEFF${lines.map((row) => row.map(csvField).join(',')).join('\r\n')}\r\n`;
    return Buffer.from(csv, 'utf8').toString('base64');
}

function costFromPlan(plan) {
    const lines = (plan.quantityTakeoff || []).map((item) => ({
        category: item.category,
        materialType: item.itemId,
        description: item.description,
        quantity: item.sellingUnit === 'pack' ? item.packsToBuy : (item.purchaseQuantity ?? item.requiredQuantity),
        unit: item.sellingUnit || item.requiredUnit,
        priceConfidence: 'unknown',
        assumptions: item.equationDescription,
    }));
    return {
        lines,
        materialsSubtotalZAR: undefined,
        deliveryEstimateZAR: undefined,
        contingencyPercent: undefined,
        contingencyZAR: undefined,
        estimatedTotalZAR: undefined,
        lowEstimateZAR: undefined,
        highEstimateZAR: undefined,
        assumptions: [
            plan.affordability.reason,
            ...plan.assumptions,
            'Missing prices stay unknown. This estimate does not treat an incomplete subtotal as affordable.',
            ...plan.professionalReview.map((item) => `${item}: PROFESSIONAL_REVIEW_REQUIRED.`),
        ],
        affordability: plan.affordability.status,
    };
}

module.exports = {
    csvFromPlan,
    costFromPlan,
};
