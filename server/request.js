const TYPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LABEL = /^[\p{L}\p{N}][\p{L}\p{N}\s.'-]{0,79}$/u;
const MAX_ITEMS = 48;
const MAX_SPAN_M = 500;
const MAX_AREA_M2 = 100000;
const MAX_NOTE = 280;
const MAX_AREA_FACTOR = 15;

function invalid(message) {
    const error = new Error(message);
    error.status = 400;
    throw error;
}

function decimalPlaces(value) {
    const text = String(value);
    if (/e/i.test(text)) return 99;
    const dot = text.indexOf('.');
    return dot === -1 ? 0 : text.length - dot - 1;
}

function readItems(value, field) {
    if (!Array.isArray(value)) invalid(`${field} must be an array`);
    return value.map((item) => {
        const type = item && typeof item.type === 'string' ? item.type.trim() : '';
        const label = item && typeof item.label === 'string' ? item.label.trim() : '';
        if (!TYPE.test(type) || !LABEL.test(label)) {
            invalid('Each item needs a valid type and label.');
        }
        return { type, label };
    });
}

function readMeasure(source, key, max) {
    if (!Object.prototype.hasOwnProperty.call(source, key) || source[key] == null) return undefined;
    const value = source[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > max || decimalPlaces(value) > 2) {
        invalid('Property measurements are not valid.');
    }
    return Math.round(value * 100) / 100;
}

function readProperty(value) {
    if (value == null) return undefined;
    if (typeof value !== 'object' || Array.isArray(value)) {
        invalid('Property measurements are not valid.');
    }
    const widthM = readMeasure(value, 'widthM', MAX_SPAN_M);
    const lengthM = readMeasure(value, 'lengthM', MAX_SPAN_M);
    const desiredFloorAreaM2 = readMeasure(value, 'desiredFloorAreaM2', MAX_AREA_M2);
    let notes;
    if (Object.prototype.hasOwnProperty.call(value, 'notes') && value.notes != null) {
        if (typeof value.notes !== 'string' || value.notes.length > MAX_NOTE) {
            invalid('Property measurements are not valid.');
        }
        const cleaned = value.notes.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
        if (cleaned) notes = cleaned;
    }
    if (
        widthM != null
        && lengthM != null
        && desiredFloorAreaM2 != null
        && desiredFloorAreaM2 > widthM * lengthM * MAX_AREA_FACTOR
    ) {
        invalid('Property measurements are not valid.');
    }
    const property = {};
    if (widthM != null) property.widthM = widthM;
    if (lengthM != null) property.lengthM = lengthM;
    if (desiredFloorAreaM2 != null) property.desiredFloorAreaM2 = desiredFloorAreaM2;
    if (notes) property.notes = notes;
    return Object.keys(property).length ? property : undefined;
}

function parseJsonField(value, label) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
        return JSON.parse(trimmed);
    } catch {
        invalid(`${label} could not be read.`);
    }
}

function cleanLocationText(value) {
    if (typeof value !== 'string') invalid('Location is not valid.');
    const cleaned = value.replace(/[<>]/g, '').replace(/[\u0000-\u001F]/g, '').trim();
    if (cleaned.length > 120) invalid('Location is not valid.');
    return cleaned;
}

function readLocation(value) {
    const source = parseJsonField(value, 'Location');
    if (source == null || source === '') return undefined;
    if (typeof source !== 'object' || Array.isArray(source)) invalid('Location is not valid.');
    const location = {};
    if (source.area != null && source.area !== '') {
        const area = cleanLocationText(source.area);
        if (area) location.area = area;
    }
    const hasLatitude = source.latitude != null && source.latitude !== '';
    const hasLongitude = source.longitude != null && source.longitude !== '';
    if (hasLatitude || hasLongitude) {
        const latitude = source.latitude;
        const longitude = source.longitude;
        if (
            typeof latitude !== 'number'
            || typeof longitude !== 'number'
            || !Number.isFinite(latitude)
            || !Number.isFinite(longitude)
            || latitude < -90
            || latitude > 90
            || longitude < -180
            || longitude > 180
        ) {
            invalid('Location is not valid.');
        }
        location.latitude = Math.round(latitude * 100) / 100;
        location.longitude = Math.round(longitude * 100) / 100;
    }
    return Object.keys(location).length ? location : undefined;
}

const RESIDENCE = new Set(['informal-settlement', 'apartment', 'condo', 'house']);

function readResidence(value) {
    if (value == null || value === '') return undefined;
    const residence = typeof value === 'string' ? value.trim() : '';
    if (!RESIDENCE.has(residence)) invalid('Residence type is not valid.');
    return residence;
}

function fieldValue(source, key, label) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) return undefined;
    return parseJsonField(source[key], label);
}

function parseHomeDesignBody(body, options = {}) {
    const source = body || {};
    const materials = readItems(fieldValue(source, 'materials', 'Materials'), 'materials');
    const furniture = readItems(fieldValue(source, 'furniture', 'Furniture'), 'furniture');
    const total = materials.length + furniture.length;
    if (total === 0 && !options.allowEmpty) invalid('Add at least one material or furniture item');
    if (total > MAX_ITEMS) invalid('A design can include at most 48 items');
    const property = readProperty(parseJsonField(source.property, 'Property'));
    const location = readLocation(source.location);
    const residence = readResidence(source.residence);
    const visualise = source.visualise === true || source.visualise === 'true';
    const conceptName = typeof source.conceptName === 'string'
        ? source.conceptName.replace(/[<>]/g, '').trim().slice(0, 80)
        : '';
    const conceptSlug = conceptName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    const projectId = conceptSlug.length >= 2
        ? conceptSlug
        : (typeof source.projectId === 'string' && /^[A-Za-z0-9-]{8,80}$/.test(source.projectId) ? source.projectId : undefined);
    return { materials, furniture, property, location, residence, visualise, projectId, conceptName };
}

module.exports = {
    parseHomeDesignBody,
    MAX_NOTE,
    MAX_SPAN_M,
    MAX_AREA_M2,
};
