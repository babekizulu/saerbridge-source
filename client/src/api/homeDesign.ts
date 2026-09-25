import axios from 'axios';
import { clearPublicKeyCache, productionApiOriginAllowed, sealPayload } from './seal';
import type { DesignItem } from '../data/designItems';
import type { SceneSpec } from '../three/sceneTypes';
import type { PropertyDimensions } from '../property';
import type { ResidenceType } from '../components/ResidenceChoice';

export type CostLine = {
    category: string;
    materialType: string;
    description: string;
    quantity?: number;
    unit?: string;
    unitPriceZAR?: number;
    quantityCostZAR?: number;
    supplierId?: string;
    supplierName?: string;
    priceConfidence: 'verified-listed' | 'listed-undated' | 'estimated' | 'unknown';
    assumptions?: string;
};

export type CostSummary = {
    lines: CostLine[];
    materialsSubtotalZAR?: number;
    deliveryEstimateZAR?: number;
    contingencyPercent?: number;
    contingencyZAR?: number;
    estimatedTotalZAR?: number;
    lowEstimateZAR?: number;
    highEstimateZAR?: number;
    assumptions: string[];
};

export type SupplierOffer = {
    materialType: string;
    productName?: string;
    unit?: string;
    priceZAR?: number;
    priceType: 'listed-current' | 'listed-undated' | 'estimated' | 'quote-required';
    notes?: string;
};

export type SupplierResult = {
    id: string;
    name: string;
    address?: string;
    suburb?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    website?: string;
    phone?: string;
    materialCategories: string[];
    offers: SupplierOffer[];
    deliveryAvailable?: boolean;
    deliveryNotes?: string;
    sourceUrl: string;
    sourceTitle?: string;
    checkedAt: string;
    confidence: 'high' | 'medium' | 'low';
};

export type PlanRoom = {
    id: string;
    type: string;
    name: string;
    widthMm: number;
    lengthMm: number;
    areaMm2: number;
};

export type PlanOpening = {
    id: string;
    kind: string;
    wallId: string;
    widthMm: number;
    heightMm: number;
};

export type PlanQuantity = {
    itemId: string;
    assemblyId: string;
    description: string;
    specification: string;
    requiredQuantity: number | null;
    requiredUnit: string;
    purchaseQuantity: number | null;
    packsToBuy: number | null;
    packSize: number | null;
    equationDescription: string;
    inputs?: Record<string, number | string | null>;
    priceStatus: string;
    quantityStatus: string;
    provenance: string;
};

export type ProjectPlanSummary = {
    projectId: string;
    conceptName?: string;
    revision: number;
    schemaVersion: string;
    geometryRuleVersion: string;
    quantityRuleVersion: string;
    costingRuleVersion: string;
    createdAt: string;
    updatedAt: string;
    outputStatus: string;
    scheduleText: string;
    site: {
        plotWidthMm: number;
        plotLengthMm: number;
        plotAreaMm2: number;
        storeys: number;
        desiredBuildingAreaMm2: number;
    };
    footprint: { widthMm: number; lengthMm: number; areaMm2: number } | null;
    rooms: PlanRoom[];
    openings: PlanOpening[];
    quantityTakeoff: PlanQuantity[];
    affordability: { status: string; reason?: string };
    assumptions: string[];
    professionalReview: string[];
};

export type EmailDelivery = { available: boolean; token?: string; expiresAt?: string; files?: string[] };

export type DesignResult = {
    emailDelivery: EmailDelivery;
    image: string;
    pdfUrl: string;
    spreadsheetUrl: string;
    costAnalysis: CostSummary | null;
    suppliers: SupplierResult[];
    savings: { title: string; reason: string }[];
    suggestedMaterials: { type: string; label: string }[];
    renovationMode: boolean;
    supplierStatus: string;
    spreadsheetStatus: string;
    pdfStatus: string;
    spaceTally: SpaceTally | null;
    blueprintSvg: string;
    blueprintDxf: string;
    visualisationStatus: 'queued' | 'ready' | 'failed' | 'skipped' | '';
    projectPlan: ProjectPlanSummary | null;
    sceneSpec: SceneSpec | null;
};

export type SpaceTally = {
    rooms: number;
    bathrooms: number;
    kitchens: number;
    garages: number;
    source: 'selection' | 'concept' | 'plan';
};

type DesignResponse = {
    emailDelivery?: EmailDelivery;
    image?: string;
    pdf?: string;
    spreadsheet?: string;
    imageUrl?: string;
    pdfUrl?: string;
    costAnalysis?: CostSummary;
    suppliers?: SupplierResult[];
    savings?: { title: string; reason: string }[];
    suggestedMaterials?: { type: string; label: string }[];
    supplierStatus?: string;
    spreadsheetStatus?: string;
    pdfStatus?: string;
    projectSummary?: { renovationMode?: boolean };
    spaceTally?: SpaceTally;
    blueprintSvg?: string;
    blueprintDxf?: string;
    visualisationStatus?: DesignResult['visualisationStatus'];
    projectPlan?: ProjectPlanSummary;
    sceneSpec?: SceneSpec;
    error?: string;
};

export type DesignRequest = {
    items: DesignItem[];
    property?: PropertyDimensions | null;
    residence?: ResidenceType | null;
    location?: { area?: string; latitude?: number; longitude?: number } | null;
    photo?: File | null;
    visualise?: boolean;
    projectId?: string;
    conceptName?: string;
    signal?: AbortSignal;
    onProgress?: (step: string, state: string) => void;
};

function bytesFromBase64(value: string) {
    const base64 = value.includes(',') ? value.split(',')[1] : value;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

function imageSrc(image: string) {
    if (
        image.startsWith('data:')
        || image.startsWith('http')
        || image.startsWith('/')
        || image.startsWith('blob:')
    ) {
        return image;
    }
    return `data:image/png;base64,${image}`;
}

async function fileObjectUrl(value: string, mime: string) {
    if (value.startsWith('blob:')) return value;
    if (value.startsWith('http') || value.startsWith('/')) {
        const response = await axios.get<Blob>(value, { responseType: 'blob' });
        return URL.createObjectURL(response.data);
    }
    return URL.createObjectURL(new Blob([bytesFromBase64(value)], { type: mime }));
}

function selection(items: DesignItem[]) {
    return {
        materials: items
            .filter((item) => item.category === 'material')
            .map(({ type, label }) => ({ type, label })),
        furniture: items
            .filter((item) => item.category === 'furniture')
            .map(({ type, label }) => ({ type, label })),
    };
}

function readSpaceTally(value: SpaceTally | undefined): SpaceTally | null {
    if (!value) return null;
    const counts = [value.rooms, value.bathrooms, value.kitchens, value.garages];
    const countsAreWhole = counts.every((count) => Number.isInteger(count) && count >= 0 && count <= 12);
    if (!countsAreWhole) return null;
    if (value.source !== 'selection' && value.source !== 'concept' && value.source !== 'plan') return null;
    return {
        rooms: value.rooms,
        bathrooms: value.bathrooms,
        kitchens: value.kitchens,
        garages: value.garages,
        source: value.source,
    };
}

function toDesignResult(data: DesignResponse): Promise<DesignResult> {
    const image = data.image ?? data.imageUrl ?? '';
    const plan = data.projectPlan ?? null;
    if (!image && !data.blueprintSvg && !plan) throw new Error(data.error || 'Design response was incomplete');
    const pdf = data.pdf ?? data.pdfUrl ?? '';
    const spreadsheet = data.spreadsheet ?? '';
    return Promise.all([
        pdf ? fileObjectUrl(pdf, 'application/pdf') : Promise.resolve(''),
        spreadsheet
            ? fileObjectUrl(spreadsheet, 'text/csv')
            : Promise.resolve(''),
    ]).then(([pdfUrl, spreadsheetUrl]) => ({
        emailDelivery: data.emailDelivery ?? { available: false },
        image: image ? imageSrc(image) : '',
        pdfUrl,
        spreadsheetUrl,
        costAnalysis: data.costAnalysis ?? null,
        suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
        savings: Array.isArray(data.savings) ? data.savings : [],
        suggestedMaterials: Array.isArray(data.suggestedMaterials) ? data.suggestedMaterials : [],
        renovationMode: Boolean(data.projectSummary?.renovationMode),
        supplierStatus: data.supplierStatus || 'skipped',
        spreadsheetStatus: data.spreadsheetStatus || (spreadsheet ? 'ok' : 'unavailable'),
        pdfStatus: data.pdfStatus || (pdf ? 'ok' : 'unavailable'),
        spaceTally: readSpaceTally(data.spaceTally),
        blueprintSvg: data.blueprintSvg || '',
        blueprintDxf: data.blueprintDxf || '',
        visualisationStatus: data.visualisationStatus || (image ? 'ready' : ''),
        projectPlan: plan,
        sceneSpec: data.sceneSpec?.projectId ? data.sceneSpec : null,
    }));
}

async function readBody(response: Response, onProgress?: (step: string, state: string) => void) {
    const type = response.headers.get('content-type') || '';
    if (!type.includes('application/x-ndjson')) {
        const data = await response.json() as DesignResponse;
        if (!response.ok) throw new Error(data.error || 'The design could not be generated.');
        return data;
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('The design could not be generated.');
    const decoder = new TextDecoder();
    let buffer = '';
    let result: DesignResponse | null = null;
    const consume = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as DesignResponse & { type?: string; step?: string; state?: string };
        if (event.type === 'progress' && event.step && event.state) onProgress?.(event.step, event.state);
        if (event.type === 'error') throw new Error(event.error || 'The design could not be generated.');
        if (event.type === 'result') result = event;
    };
    while (true) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        lines.forEach(consume);
        if (chunk.done) break;
    }
    if (buffer.trim()) consume(buffer);
    if (!response.ok && !result) throw new Error('The design could not be generated.');
    if (!result) throw new Error('The design could not be generated.');
    return result;
}

// Empty in development: Vite proxies /api. Set this to the Railway HTTPS origin on Netlify.
export const apiOrigin = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export async function requestHomeDesign({ items, property, residence, location, photo, visualise, projectId, conceptName, signal, onProgress }: DesignRequest) {
    const chosen = selection(items);
    const headers = { Accept: 'application/x-ndjson' };
    const local = new AbortController();
    let timedOut = false;
    const timer = window.setTimeout(() => {
        timedOut = true;
        local.abort();
    }, 600000);
    const abortFromParent = () => local.abort();
    signal?.addEventListener('abort', abortFromParent, { once: true });
    if (signal?.aborted) local.abort();
    if (!productionApiOriginAllowed(apiOrigin, import.meta.env.PROD)) {
        throw new Error('The design server must be reached over HTTPS.');
    }
    let response: Response;
    try {
        const payload: {
            materials: { type: string; label: string }[];
            furniture: { type: string; label: string }[];
            property?: PropertyDimensions;
            residence?: ResidenceType;
            location?: DesignRequest['location'];
            visualise?: boolean;
            projectId?: string;
            conceptName?: string;
        } = chosen;
        if (property && Object.keys(property).length > 0) payload.property = property;
        if (residence) payload.residence = residence;
        if (location && (location.area || location.latitude != null)) payload.location = location;
        if (visualise) payload.visualise = true;
        if (projectId) payload.projectId = projectId;
        if (conceptName) payload.conceptName = conceptName;
        const envelope = await sealPayload(apiOrigin, payload);
        if (photo) {
            const form = new FormData();
            form.append('envelope', JSON.stringify(envelope));
            form.append('consent', 'true');
            form.append('image', photo, 'property.jpg');
            response = await fetch(`${apiOrigin}/api/home-design`, { method: 'POST', body: form, headers, signal: local.signal });
        } else {
            response = await fetch(`${apiOrigin}/api/home-design`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ envelope }),
                signal: local.signal,
            });
        }
        if (response.status === 400) clearPublicKeyCache();
        const data = await readBody(response, onProgress);
        return toDesignResult(data);
    } catch (error) {
        if (timedOut) throw new Error('Design generation exceeded ten minutes. Please try again.', { cause: error });
        if (!local.signal.aborted && error instanceof TypeError) {
            throw new Error('The connection to the design server was interrupted. Check that the server is running and try again.', { cause: error });
        }
        throw error;
    } finally {
        window.clearTimeout(timer);
        signal?.removeEventListener('abort', abortFromParent);
    }
}
