const { z } = require('zod');
const { supplierResearchDto } = require('./security/aiPayload');

const OfferSchema = z.object({
    materialType: z.string().trim().min(1).max(40),
    productName: z.string().trim().max(120).optional(),
    unit: z.string().trim().max(40).optional(),
    priceZAR: z.number().finite().positive().max(1_000_000).optional(),
    priceType: z.enum(['listed-current', 'listed-undated', 'estimated', 'quote-required']),
    notes: z.string().trim().max(240).optional(),
});

const SupplierSchema = z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().max(200).optional(),
    suburb: z.string().trim().max(80).optional(),
    city: z.string().trim().max(80).optional(),
    website: z.string().trim().max(300).optional(),
    phone: z.string().trim().max(40).optional(),
    materialCategories: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    offers: z.array(OfferSchema).max(12).default([]),
    deliveryAvailable: z.boolean().optional(),
    deliveryNotes: z.string().trim().max(200).optional(),
    sourceUrl: z.string().trim().max(500),
    sourceTitle: z.string().trim().max(160).optional(),
    confidence: z.enum(['high', 'medium', 'low']).default('low'),
});

function httpUrl(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        if (!url.hostname.includes('.')) return null;
        if (url.hostname === 'example.com' || url.hostname.endsWith('.example.com')) return null;
        if (url.hostname === 'localhost' || url.hostname.endsWith('.local')) return null;
        return url;
    } catch {
        return null;
    }
}

function cleanOffer(offer) {
    if (offer.priceType === 'quote-required' || typeof offer.priceZAR !== 'number') {
        return {
            materialType: offer.materialType,
            productName: offer.productName,
            unit: offer.unit,
            priceType: 'quote-required',
            notes: offer.notes,
        };
    }
    return {
        materialType: offer.materialType,
        productName: offer.productName,
        unit: offer.unit,
        priceZAR: Math.round(offer.priceZAR * 100) / 100,
        priceType: offer.priceType,
        notes: offer.notes,
    };
}

function normalizeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function sameSupplier(left, right) {
    if (left === right) return true;
    const shorter = left.length < right.length ? left : right;
    const longer = left.length < right.length ? right : left;
    return shorter.length > 6 && longer.includes(shorter);
}

function dedupeSuppliers(suppliers) {
    const kept = [];
    suppliers.forEach((supplier) => {
        const name = normalizeName(supplier.name);
        const existing = kept.find((candidate) => sameSupplier(normalizeName(candidate.name), name));
        if (!existing) {
            kept.push(supplier);
            return;
        }
        if ((supplier.offers || []).length > (existing.offers || []).length) {
            const index = kept.indexOf(existing);
            kept[index] = supplier;
        }
    });
    return kept;
}

function loosenSupplier(item) {
    if (!item || typeof item !== 'object') return item;
    const copy = { ...item };
    if (Array.isArray(copy.offers)) {
        copy.offers = copy.offers.map((offer) => {
            if (!offer || typeof offer !== 'object') return offer;
            const next = { ...offer };
            if (next.priceZAR === null || next.priceZAR === '') delete next.priceZAR;
            return next;
        });
    }
    return copy;
}

function normalizeSuppliers(input, citationHosts = []) {
    const list = Array.isArray(input) ? input : input?.suppliers;
    if (!Array.isArray(list)) return [];
    const hosts = new Set(citationHosts.map((host) => String(host).toLowerCase()));
    const accepted = [];
    list.forEach((item) => {
        const parsed = SupplierSchema.safeParse(loosenSupplier(item));
        if (!parsed.success) return;
        const source = httpUrl(parsed.data.sourceUrl);
        if (!source) return;
        if (parsed.data.website && !httpUrl(parsed.data.website)) {
            delete parsed.data.website;
        }
        const host = source.hostname.toLowerCase();
        let confidence = parsed.data.confidence;
        if (hosts.size > 0 && ![...hosts].some((known) => host === known || host.endsWith(`.${known}`) || known.endsWith(`.${host}`))) {
            return;
        }
        if (hosts.size === 0 && confidence === 'high') confidence = 'medium';
        accepted.push({
            id: `${normalizeName(parsed.data.name).replace(/\s+/g, '-')}-${accepted.length + 1}`,
            name: parsed.data.name,
            address: parsed.data.address,
            suburb: parsed.data.suburb,
            city: parsed.data.city,
            website: parsed.data.website,
            phone: parsed.data.phone,
            materialCategories: parsed.data.materialCategories,
            offers: parsed.data.offers.map(cleanOffer),
            deliveryAvailable: parsed.data.deliveryAvailable,
            deliveryNotes: parsed.data.deliveryNotes,
            sourceUrl: source.toString(),
            sourceTitle: parsed.data.sourceTitle,
            confidence,
            checkedAt: new Date().toISOString(),
        });
    });
    return dedupeSuppliers(accepted).slice(0, 8);
}

function citationHostsFromResponse(response) {
    const hosts = [];
    const output = Array.isArray(response?.output) ? response.output : [];
    output.forEach((item) => {
        const content = Array.isArray(item.content) ? item.content : [];
        content.forEach((part) => {
            const annotations = Array.isArray(part.annotations) ? part.annotations : [];
            annotations.forEach((note) => {
                const url = httpUrl(note?.url || '');
                if (url) hosts.push(url.hostname);
            });
        });
    });
    return hosts;
}

function readJson(text) {
    const trimmed = String(text || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    try {
        return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
        return null;
    }
}

function researchPrompt(area, materials) {
    const categories = [...new Set(materials.map((item) => item.label))].join(', ') || 'general building materials';
    const types = [...new Set(materials.map((item) => item.type))].join(', ');
    return [
        `Find practical building-material suppliers near this area in South Africa: ${area}.`,
        `Material categories: ${categories}.`,
        `Use these materialType values when an offer matches: ${types}.`,
        'Use web search. Return only suppliers supported by a real http or https source URL.',
        'Do not invent suppliers, addresses, phone numbers, websites, or prices.',
        'Prices must be South African Rand. Never invent a number to fill priceZAR.',
        'If a current listed price is visible, use priceType listed-current.',
        'If a price has no clear date, use listed-undated.',
        'Prefer priceType quote-required with no priceZAR when a price is not visible.',
        'Use estimated only when the source itself is an estimate, and say so in notes.',
        'Do not claim any shop is the cheapest.',
        'Do not recommend unsafe salvaged structural materials.',
        'Return 3 to 8 suppliers, or fewer when evidence is thin.',
        'Return JSON only with a suppliers array. Fields: name, address, suburb, city, website, phone, materialCategories, offers, deliveryAvailable, deliveryNotes, sourceUrl, sourceTitle, confidence.',
        'offers items use materialType, productName, unit, priceZAR, priceType, notes.',
        'priceType is one of listed-current, listed-undated, estimated, quote-required.',
        'confidence is high, medium, or low.',
    ].join(' ');
}

async function researchSuppliers({ area, materials, client, models }) {
    const request = supplierResearchDto({ area, materials });
    if (!request.area) {
        return { suppliers: [], status: 'skipped' };
    }
    if (!client) {
        return { suppliers: [], status: 'unavailable' };
    }
    const prompt = researchPrompt(request.area, request.materials);
    let lastError;
    for (const model of models) {
        try {
            const response = await client.responses.create({
                model,
                tools: [{
                    type: 'web_search',
                    search_context_size: 'medium',
                    user_location: {
                        type: 'approximate',
                        country: 'ZA',
                        city: request.area.split(',')[0].trim().slice(0, 80),
                    },
                }],
                max_tool_calls: 4,
                max_output_tokens: 2500,
                input: prompt,
            });
            const parsed = readJson(response.output_text);
            const suppliers = normalizeSuppliers(parsed, citationHostsFromResponse(response));
            return { suppliers, status: 'ok' };
        } catch (error) {
            lastError = error;
            const status = error.status ? ` ${error.status}` : '';
            console.error(`Supplier research model ${model} failed${status}`);
        }
    }
    if (lastError) console.error('Supplier research unavailable');
    return { suppliers: [], status: 'unavailable' };
}

module.exports = {
    normalizeSuppliers,
    researchSuppliers,
    readJson,
};
