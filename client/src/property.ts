import type { PlacedItem } from './data/designItems';

export type PropertyDimensions = {
    widthM?: number;
    lengthM?: number;
    desiredFloorAreaM2?: number;
    notes?: string;
};

export type PropertyDraft = {
    widthM: string;
    lengthM: string;
    desiredFloorAreaM2: string;
    notes: string;
};

export type PropertyErrors = Partial<Record<keyof PropertyDraft | 'form', string>>;

export const emptyPropertyDraft = (): PropertyDraft => ({
    widthM: '',
    lengthM: '',
    desiredFloorAreaM2: '',
    notes: '',
});

const MAX_SPAN = 500;
const MAX_AREA = 100000;
const MAX_NOTE = 280;
const MAX_AREA_FACTOR = 15;

function cleanNotes(value: string) {
    return Array.from(value).filter((char) => {
        const code = char.charCodeAt(0);
        return code === 9 || code === 10 || code === 13 || code >= 32;
    }).join('');
}

export function draftFromProperty(property: PropertyDimensions | null): PropertyDraft {
    return {
        widthM: property?.widthM == null ? '' : String(property.widthM),
        lengthM: property?.lengthM == null ? '' : String(property.lengthM),
        desiredFloorAreaM2: property?.desiredFloorAreaM2 == null ? '' : String(property.desiredFloorAreaM2),
        notes: property?.notes ?? '',
    };
}

function readMeasure(raw: string, label: string, max: number, unit: string): { value?: number; error?: string } {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
        return { error: `Enter a ${label} as a number greater than zero, with at most two decimal places.` };
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value <= 0) {
        return { error: `Enter a ${label} greater than zero.` };
    }
    if (value > max) {
        return { error: `Enter a ${label} up to ${max.toLocaleString('en-ZA')} ${unit}.` };
    }
    return { value };
}

export function validatePropertyDraft(draft: PropertyDraft): PropertyErrors {
    const errors: PropertyErrors = {};
    const width = readMeasure(draft.widthM, 'width', MAX_SPAN, 'metres');
    const length = readMeasure(draft.lengthM, 'length', MAX_SPAN, 'metres');
    const area = readMeasure(draft.desiredFloorAreaM2, 'floor area', MAX_AREA, 'square metres');
    if (width.error) errors.widthM = width.error;
    if (length.error) errors.lengthM = length.error;
    if (area.error) errors.desiredFloorAreaM2 = area.error;

    const notes = cleanNotes(draft.notes);
    if (notes.length > MAX_NOTE) {
        errors.notes = `Notes must be ${MAX_NOTE} characters or fewer.`;
    }
    if (
        !errors.desiredFloorAreaM2
        && width.value != null
        && length.value != null
        && area.value != null
        && area.value > width.value * length.value * MAX_AREA_FACTOR
    ) {
        errors.desiredFloorAreaM2 = 'Desired floor area is too large for this width and length.';
    }
    const trimmedNotes = notes.trim();
    if (!width.value && !length.value && !area.value && !trimmedNotes && Object.keys(errors).length === 0) {
        errors.form = 'Enter a width, a length, a floor area, or a short note.';
    }
    return errors;
}

export function propertyFromDraft(draft: PropertyDraft): PropertyDimensions | null {
    const errors = validatePropertyDraft(draft);
    if (Object.keys(errors).length > 0) return null;
    const width = readMeasure(draft.widthM, 'width', MAX_SPAN, 'metres').value;
    const length = readMeasure(draft.lengthM, 'length', MAX_SPAN, 'metres').value;
    const area = readMeasure(draft.desiredFloorAreaM2, 'floor area', MAX_AREA, 'square metres').value;
    const notes = cleanNotes(draft.notes).trim();
    const property: PropertyDimensions = {};
    if (width != null) property.widthM = width;
    if (length != null) property.lengthM = length;
    if (area != null) property.desiredFloorAreaM2 = area;
    if (notes) property.notes = notes;
    return Object.keys(property).length ? property : null;
}

function formatNum(value: number) {
    const rounded = Math.round(value * 100) / 100;
    return String(rounded);
}

export function propertySummary(property: PropertyDimensions) {
    let text = 'Property notes added';
    if (property.widthM != null && property.lengthM != null) {
        const plot = property.widthM * property.lengthM;
        text = `Plot ${formatNum(property.widthM)} m × ${formatNum(property.lengthM)} m · ${formatNum(plot)} m²`;
        if (property.desiredFloorAreaM2 != null) {
            text += ` · dwelling ${formatNum(property.desiredFloorAreaM2)} m²`;
        }
    } else if (property.widthM != null) {
        text = `${formatNum(property.widthM)} m wide`;
    } else if (property.lengthM != null) {
        text = `${formatNum(property.lengthM)} m long`;
    } else if (property.desiredFloorAreaM2 != null) {
        text = `${formatNum(property.desiredFloorAreaM2)} m²`;
    }
    const accessible = property.notes && text !== 'Property notes added'
        ? `${text}. Notes included.`
        : text;
    return { text, accessible };
}

export function plannerKey(
    items: PlacedItem[],
    property: PropertyDimensions | null,
    context: { imageId?: string; includePhoto?: boolean; location?: string; residence?: string; concept?: string } = {},
) {
    return JSON.stringify({
        items: items.map((item) => ({
            id: item.id,
            type: item.type,
            category: item.category,
            label: item.label,
            rowBreak: Boolean(item.rowBreak),
        })),
        property,
        imageId: context.imageId || '',
        includePhoto: Boolean(context.includePhoto),
        location: context.location || '',
        residence: context.residence || '',
        concept: context.concept || '',
    });
}
