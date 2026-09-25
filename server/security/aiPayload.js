function cleanLabel(value) {
    return String(value || '').replace(/-?\d{1,3}\.\d{4,}/g, '').trim().slice(0, 80);
}

function designGuidanceDto({ materials, furniture, property, area, residence }) {
    return {
        materials: (materials || []).map((item) => ({
            type: cleanLabel(item.type),
            label: cleanLabel(item.label),
        })),
        furniture: (furniture || []).map((item) => ({
            type: cleanLabel(item.type),
            label: cleanLabel(item.label),
        })),
        plotWidthM: property?.widthM ?? null,
        plotLengthM: property?.lengthM ?? null,
        desiredDwellingAreaM2: property?.desiredFloorAreaM2 ?? null,
        area: cleanLabel(area).slice(0, 120),
        residence: cleanLabel(residence),
    };
}

function supplierResearchDto({ area, materials }) {
    return {
        area: cleanLabel(area).slice(0, 120),
        materials: (materials || []).map((item) => ({
            type: cleanLabel(item.type),
            label: cleanLabel(item.label),
        })),
    };
}

module.exports = {
    designGuidanceDto,
    supplierResearchDto,
};
