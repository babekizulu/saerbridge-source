const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const OpenAI = require('openai');
const { tallyFromModel } = require('./spaceTally');
const { designGuidanceDto } = require('./security/aiPayload');
const { redact } = require('./security/redact');
const { requestImage, imageQuality } = require('./imageRequest');

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const NAVY = rgb(17 / 255, 35 / 255, 58 / 255);
const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.35, 0.35, 0.35);

function imageModels(env = process.env) {
    return unique([
        env.OPENAI_IMAGE_MODEL,
        'gpt-image-2',
        'gpt-image-2.5-sunburst',
        'gpt-image-1.5',
        'gpt-image-1',
    ].filter(Boolean));
}

function textModels(env = process.env) {
    return unique([
        env.OPENAI_PLANNING_MODEL,
        'gpt-5.6-terra',
        env.OPENAI_TEXT_MODEL,
        'gpt-5.4-mini',
        'gpt-4.1-mini',
    ].filter(Boolean));
}

function complexModels(env = process.env) {
    return unique([
        env.OPENAI_COMPLEX_MODEL,
        'gpt-5.6-sol',
        ...textModels(env),
    ].filter(Boolean));
}

const DESIGN_PRINCIPLE = [
    'A constrained budget is a design constraint, not permission to produce an unattractive, unsafe, or disposable building.',
    'Seek elegant simplicity, efficient geometry, durable materials, repairability, good daylight, ventilation, and thoughtful use of limited space.',
    'Prefer solutions that can be built, repaired, and sourced locally.',
    'Affordability must not be interpreted as low quality.',
].join(' ');

function unique(values) {
    return [...new Set(values)];
}

function openai() {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set');
    }
    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 120000,
    });
}

function counts(items) {
    const map = new Map();
    for (const item of items) {
        map.set(item.label, (map.get(item.label) || 0) + 1);
    }
    return [...map.entries()];
}

function inventoryLine(items, empty) {
    const lines = counts(items).map(([label, count]) => `${count} x ${label}`);
    return lines.length ? lines.join(', ') : empty;
}

function sanitize(value) {
    return String(value)
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/[–—]/g, '-')
        .replace(/…/g, '...')
        .replace(/\s+/g, ' ')
        .replace(/[^\x20-\x7E]/g, '')
        .trim();
}

function shouldTryNextModel(error) {
    const status = error.status;
    if (status === 401 || status === 429) return false;
    if (status === 403 || status === 404) return true;
    const message = `${error.message || ''} ${error.error?.message || ''}`.toLowerCase();
    return (
        message.includes('model')
        || message.includes('not found')
        || message.includes('does not exist')
        || message.includes('not available')
        || message.includes('verify organization')
    );
}

function logModelError(kind, model, error) {
    const status = error.status ? ` ${error.status}` : '';
    const message = error.error?.message || error.message || 'request failed';
    const causeCode = error.cause?.cause?.code || error.cause?.code;
    console.error(redact(`${kind} model ${model} failed${status}: ${message}${causeCode ? ` (${causeCode})` : ''}`));
}

function formatMeasure(value) {
    const rounded = Math.round(value * 100) / 100;
    return String(rounded);
}

function propertyFacts(property) {
    if (!property) return '';
    const facts = [];
    if (property.widthM != null) facts.push(`approximate width ${formatMeasure(property.widthM)} m`);
    if (property.lengthM != null) facts.push(`approximate length ${formatMeasure(property.lengthM)} m`);
    if (property.desiredFloorAreaM2 != null) {
        facts.push(`desired floor area ${formatMeasure(property.desiredFloorAreaM2)} square metres`);
    }
    return facts.join('; ');
}

function residenceLine(residence) {
    if (residence === 'informal-settlement') {
        return 'Residence type: informal settlement. Plan a durable dwelling that can be improved in stages, with weather protection, drainage, ventilation, and safe services. Do not depict it as temporary, unsafe, or poor quality. Do not infer income or ethnicity.';
    }
    if (residence === 'apartment') {
        return 'Residence type: apartment. Plan one unit inside a larger building. Do not show a detached house or changes to the shared structure.';
    }
    if (residence === 'condo') {
        return 'Residence type: condo. Plan one unit in a shared building. Do not show a detached house or changes to the common structure.';
    }
    if (residence === 'house') {
        return 'Residence type: house. Plan a standalone dwelling with practical access. Do not assume a large plot.';
    }
    return '';
}

function imagePrompt(materials, furniture, property, residence, planBrief) {
    const lines = [
        'Natural architectural rendering of one coherent, livable home.',
        'The design objective is budget-sensitive, durable, safe, and resource-efficient residential design.',
        DESIGN_PRINCIPLE,
        'Believable materials, natural lighting, and realistic spatial relationships.',
        `Building materials to show: ${inventoryLine(materials, 'none specified')}.`,
        `Furniture and interior items to show: ${inventoryLine(furniture, 'none specified')}.`,
        'No text, no labels, no floor-plan annotations, no logos, no watermark, and no people.',
    ];
    if (residence === 'apartment' || residence === 'condo') {
        lines.push('Show the dwelling as one furnished unit in a larger building.');
    } else if (residence === 'informal-settlement') {
        lines.push('Show one durable home on a compact site, with a furnished interior and a practical exterior.');
    } else if (residence === 'house') {
        lines.push('Show a standalone house with an inviting exterior and a furnished interior.');
    } else {
        lines.push('Combine an inviting exterior and a furnished interior in a single image.');
    }
    const setting = residenceLine(residence);
    if (setting) lines.push(setting);
    if (planBrief) {
        lines.push(`Approved geometric design, which is the only source of dimensions: ${planBrief}`);
        lines.push('This image is a visualisation of that approved plan. Preserve the building massing, roof form, opening positions, and room arrangement. Do not add storeys, extensions, or rooms. Do not remove requested openings. Decorative detail is not an architectural change.');
        lines.push('Do not include measurements that contradict the approved plan. The image is not a survey and must not be used to take measurements.');
    }
    const facts = propertyFacts(property);
    if (facts) {
        lines.push(`Approximate user-provided property context: ${facts}.`);
        lines.push('Treat the dimensions as approximate. Attempt a visually plausible concept consistent with them.');
        lines.push('This is not a scale drawing, not an engineered design, and it does not demonstrate code compliance.');
        lines.push('Do not draw measurement labels or any other text.');
    }
    return lines.join(' ');
}

async function createImage(materials, furniture, property, residence, planBrief) {
    const client = openai();
    const prompt = imagePrompt(materials, furniture, property, residence, planBrief);

    return requestImage({
        models: imageModels(),
        shouldTryNextModel,
        onError: (model, error) => logModelError('Image', model, error),
        request: async (model, options) => {
            const body = {
                model,
                prompt,
                n: 1,
                size: '1024x1024',
            };
            if (model.startsWith('gpt-image')) {
                body.quality = imageQuality();
                body.output_format = 'png';
            } else if (model.startsWith('dall-e')) {
                body.response_format = 'b64_json';
            }
            const result = await client.images.generate(body, options);
            const image = result.data?.[0];
            if (image?.b64_json) {
                console.log(`Image generated with ${model}`);
                return image.b64_json.replace(/\s/g, '');
            }
            if (image?.url) {
                const response = await fetch(image.url, { signal: options.signal });
                if (!response.ok) throw new Error(`Image download failed (${response.status})`);
                const bytes = Buffer.from(await response.arrayBuffer());
                console.log(`Image generated with ${model}`);
                return bytes.toString('base64');
            }
            throw new Error('Image response was empty');
        },
    });
}

function renovationPrompt(materials, furniture, property, area, automatic, residence) {
    const lines = [
        'Create a realistic renovation concept based on the supplied photograph.',
        'Preserve useful parts of the existing structure when practical, including orientation, visible site proportions, footprint, neighbouring context, access, yard, and doors or windows that can be retained.',
        'Improve weather protection, ventilation, daylight, safety, appearance, and use of space.',
        'Avoid unnecessary demolition. Prefer creative reuse where it is safe.',
        'The design is intended to be achievable with a constrained household budget, but affordability must not be interpreted as low quality.',
        'Prefer durable, maintainable, locally obtainable materials.',
        DESIGN_PRINCIPLE,
        'Do not recreate identifiable people from the source image. Focus on the building and environment. Prefer a final architectural concept with no people.',
        'Do not add labels, text, logos, or watermarks.',
        'Do not present the image as engineered, certified, or approved.',
        automatic
            ? 'Choose an economical and practical material palette automatically.'
            : 'Prioritize the explicitly selected materials where they are suitable.',
        `Materials: ${inventoryLine(materials, 'choose a practical palette')}.`,
        `Furniture and interior items: ${inventoryLine(furniture, 'none specified')}.`,
    ];
    const facts = propertyFacts(property);
    if (facts) lines.push(`Approximate user-provided property context: ${facts}. Treat these figures as unverified.`);
    if (area) lines.push(`Approximate area context for climate and local materials: ${area}. Do not infer income, ethnicity, or any other personal attribute.`);
    const setting = residenceLine(residence);
    if (setting) lines.push(setting);
    return lines.join(' ');
}

async function createRenovationImage({ photograph, materials, furniture, property, area, automatic, residence }) {
    const client = openai();
    const { toFile } = require('openai');
    const prompt = renovationPrompt(materials, furniture, property, area, automatic, residence);
    return requestImage({
        models: imageModels(),
        shouldTryNextModel,
        onError: (model, error) => logModelError('Renovation image', model, error),
        request: async (model, options) => {
            const file = await toFile(photograph.buffer, 'property.jpg', { type: photograph.mimeType || 'image/jpeg' });
            const body = {
                model,
                image: file,
                prompt,
                n: 1,
                size: '1024x1024',
            };
            if (model.startsWith('gpt-image')) {
                body.quality = imageQuality();
                body.output_format = 'png';
            }
            const result = await client.images.edit(body, options);
            const image = result.data?.[0];
            if (image?.b64_json) {
                console.log(`Renovation image edited with ${model}`);
                return image.b64_json.replace(/\s/g, '');
            }
            if (image?.url) {
                const response = await fetch(image.url, { signal: options.signal });
                if (!response.ok) throw new Error(`Image download failed (${response.status})`);
                const bytes = Buffer.from(await response.arrayBuffer());
                console.log(`Renovation image edited with ${model}`);
                return bytes.toString('base64');
            }
            throw new Error('Image response was empty');
        },
    });
}

function readInstructions(content) {
    const trimmed = content.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const data = JSON.parse(trimmed);
    const summary = sanitize(data.summary || '').slice(0, 700);
    const sections = Array.isArray(data.sections)
        ? data.sections
            .map((section) => ({
                heading: sanitize(section?.heading || '').slice(0, 80),
                body: sanitize(section?.body || '').slice(0, 1800),
            }))
            .filter((section) => section.heading && section.body)
            .slice(0, 12)
        : [];
    if (!summary || sections.length === 0) {
        throw new Error('Instruction response was incomplete');
    }
    return { summary, sections, spaceTally: tallyFromModel(data.spaceTally) };
}

function instructionContext(materials, furniture, property, context = {}) {
    const guidance = designGuidanceDto({
        materials,
        furniture,
        property,
        area: context.area,
        residence: context.residence,
    });
    const lines = [
        `Materials: ${inventoryLine(guidance.materials, 'none')}.`,
        `Furniture: ${inventoryLine(guidance.furniture, 'none')}.`,
        context.renovation
            ? 'This is a renovation concept based on a photograph of an existing dwelling. Prioritise leaks, drainage, weather sealing, ventilation, safe access, and sanitation-related review before decorative work.'
            : 'This is a new home concept.',
        context.automatic
            ? 'The material palette was suggested automatically because the user did not select materials. Say that clearly.'
            : 'Prefer the materials the user selected where they are suitable.',
    ];
    if (guidance.area) {
        lines.push(`Approximate area: ${guidance.area}. You may consider rainfall, sun, ventilation, and commonly obtainable materials. Do not infer ethnicity, income, politics, or any other personal attribute.`);
    } else {
        lines.push('No location was provided. Do not assume a city or climate beyond general care for weather protection.');
    }
    const facts = propertyFacts({
        widthM: guidance.plotWidthM,
        lengthM: guidance.plotLengthM,
        desiredFloorAreaM2: guidance.desiredDwellingAreaM2,
    });
    if (!facts) {
        lines.push('No property dimensions were provided. Do not invent measurements or exact quantities.');
    } else {
        lines.push(`User-provided approximate property context: ${facts}.`);
        lines.push('Use those figures only as approximate context. Do not treat them as a survey.');
    }
    const setting = residenceLine(guidance.residence);
    if (setting) lines.push(setting);
    lines.push('Do not claim structural safety, building-regulation compliance, engineering, municipal approval, or that the design is permit-ready.');
    lines.push('For load-bearing walls, foundations, roof structure, excavation, mains electricity, gas, sanitation, and municipal water, say that a qualified local professional must verify the work.');
    lines.push('Divide the work into phases only when that is useful: essential safety and weatherproofing, core function, interior improvement, then optional appearance upgrades.');
    lines.push('Include a space tally for rooms, bathrooms, kitchens, and garages. Count bedrooms, a living room, and a work room together as rooms. When furniture is listed, follow those items. When only a photograph is available, estimate a modest tally from the building. Use 0 when you cannot tell.');
    lines.push(DESIGN_PRINCIPLE);
    return lines.join('\n');
}

async function createInstructions(materials, furniture, property, context = {}) {
    const client = openai();
    const messages = [
        {
            role: 'system',
            content: [
                'You write home design guidance for Saerbridge Source.',
                'The internal objective is budget-sensitive, durable, safe, and resource-efficient residential design.',
                DESIGN_PRINCIPLE,
                'Explain placement, a practical sequence, phased improvements, care, and local procurement in general terms.',
                'Do not invent prices, suppliers, or surveyed measurements.',
                'State that this is concept guidance only, not an engineered or permitted construction document.',
                'Never call the result approved, certified, engineered, or permit-ready.',
                'Use plain ASCII punctuation.',
                'Return JSON with "summary" (one paragraph), "sections" (array of { "heading", "body" }), and "spaceTally" ({ "rooms", "bathrooms", "kitchens", "garages" } as integers from 0 to 12).',
                'Include sections for design intent, material strategy, interior strategy, affordability strategy, implementation sequence, phased improvements, and care.',
            ].join(' '),
        },
        {
            role: 'user',
            content: instructionContext(materials, furniture, property, context),
        },
    ];

    let lastError;
    for (const model of textModels()) {
        try {
            const completion = await client.chat.completions.create({
                model,
                messages,
                response_format: { type: 'json_object' },
                max_completion_tokens: 1600,
            });
            const content = completion.choices?.[0]?.message?.content;
            if (!content) throw new Error('Instruction response was empty');
            const instructions = readInstructions(content);
            console.log(`Instructions written with ${model}`);
            return instructions;
        } catch (error) {
            const message = `${error.message || ''} ${error.error?.message || ''}`.toLowerCase();
            if (message.includes('max_completion_tokens') || message.includes('response_format')) {
                try {
                    const completion = await client.chat.completions.create({
                        model,
                        messages,
                        max_tokens: 1600,
                    });
                    const content = completion.choices?.[0]?.message?.content;
                    if (!content) throw new Error('Instruction response was empty');
                    const instructions = readInstructions(content);
                    console.log(`Instructions written with ${model}`);
                    return instructions;
                } catch (retryError) {
                    lastError = retryError;
                    logModelError('Text', model, retryError);
                    if (!shouldTryNextModel(retryError)) break;
                    continue;
                }
            }
            lastError = error;
            logModelError('Text', model, error);
            if (!shouldTryNextModel(error)) break;
        }
    }
    throw lastError || new Error('Instruction generation failed');
}

function wrap(text, font, size, maxWidth) {
    const lines = [];
    const paragraphs = text.split(/\n+/);
    for (const paragraph of paragraphs) {
        const words = paragraph.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
            lines.push('');
            continue;
        }
        let line = '';
        for (const word of words) {
            const next = line ? `${line} ${word}` : word;
            if (font.widthOfTextAtSize(next, size) <= maxWidth) {
                line = next;
                continue;
            }
            if (line) lines.push(line);
            if (font.widthOfTextAtSize(word, size) <= maxWidth) {
                line = word;
                continue;
            }
            let chunk = '';
            for (const char of word) {
                const trial = chunk + char;
                if (font.widthOfTextAtSize(trial, size) > maxWidth && chunk) {
                    lines.push(chunk);
                    chunk = char;
                } else {
                    chunk = trial;
                }
            }
            line = chunk;
        }
        if (line) lines.push(line);
    }
    return lines;
}

function propertyPdfLines(property) {
    if (!property) return [];
    const lines = ['PROPERTY INFORMATION', ''];
    if (property.widthM != null) lines.push(`Approximate width: ${formatMeasure(property.widthM)} m`);
    if (property.lengthM != null) lines.push(`Approximate length: ${formatMeasure(property.lengthM)} m`);
    if (property.desiredFloorAreaM2 != null) {
        lines.push(`Desired floor area: ${formatMeasure(property.desiredFloorAreaM2)} m²`);
    }
    if (property.notes) {
        lines.push('', 'Property notes:', sanitize(property.notes));
    }
    lines.push('', 'These are user-provided planning measurements and have not been independently surveyed or verified.');
    return lines;
}

function costPdfLines(cost) {
    if (!cost) return [];
    const lines = ['APPROXIMATE COST SUMMARY', ''];
    if (cost.estimatedTotalZAR == null) {
        lines.push('A rand total is not shown because verified quantities and prices were not both available.');
    } else {
        lines.push(`Low planning estimate: ZAR ${cost.lowEstimateZAR}`);
        lines.push(`Central planning estimate: ZAR ${cost.estimatedTotalZAR}`);
        lines.push(`High planning estimate: ZAR ${cost.highEstimateZAR}`);
        if (cost.contingencyPercent != null) {
            lines.push(`Contingency included in those figures: ${cost.contingencyPercent} percent.`);
        }
    }
    lines.push('Prices are indicative planning information, not supplier quotations.');
    lines.push('Detailed procurement data is kept in the spreadsheet rather than this document.');
    return lines;
}

function addBlueprintSheet(doc, font, bold, plan) {
    const sheetWidth = 1190.55;
    const sheetHeight = 841.89;
    const page = doc.insertPage(0, [sheetWidth, sheetHeight]);
    page.drawText('SHEET A101  Dimensioned floor plan', {
        x: 36,
        y: sheetHeight - 42,
        size: 16,
        font: bold,
        color: NAVY,
    });
    page.drawText(`Project ${plan.projectId}   revision ${plan.revision}`, {
        x: 36,
        y: sheetHeight - 64,
        size: 11,
        font,
        color: INK,
    });
    page.drawText('Sheets A102, A201, A301, A401, and A501 are not drawn in this revision. They are not invented.', {
        x: 36,
        y: sheetHeight - 82,
        size: 10,
        font,
        color: MUTED,
    });
    const footprint = plan.footprint;
    const rooms = plan.rooms || [];
    if (!footprint || !rooms.length) {
        page.drawText('No dwelling footprint was generated. Plot dimensions are not the building area.', {
            x: 36,
            y: 400,
            size: 12,
            font,
            color: INK,
        });
        return;
    }
    const originX = 72;
    const originY = 110;
    const maxW = 980;
    const maxH = 620;
    const scale = Math.min(maxW / footprint.widthMm, maxH / footprint.lengthMm);
    const drawW = footprint.widthMm * scale;
    const drawH = footprint.lengthMm * scale;
    page.drawRectangle({
        x: originX,
        y: originY,
        width: drawW,
        height: drawH,
        borderColor: NAVY,
        borderWidth: 1.5,
    });
    rooms.forEach((room) => {
        const x = originX + room.xMm * scale;
        const y = originY + (footprint.lengthMm - room.yMm - room.lengthMm) * scale;
        const roomWidth = room.widthMm * scale;
        const roomHeight = room.lengthMm * scale;
        page.drawRectangle({
            x,
            y,
            width: roomWidth,
            height: roomHeight,
            borderColor: NAVY,
            borderWidth: 0.7,
        });
        if (roomWidth > 70 && roomHeight > 28) {
            page.drawText(room.name, {
                x: x + 8,
                y: y + roomHeight / 2,
                size: 10,
                font: bold,
                color: NAVY,
            });
            page.drawText(`${room.widthMm} x ${room.lengthMm} mm`, {
                x: x + 8,
                y: y + roomHeight / 2 - 14,
                size: 9,
                font,
                color: INK,
            });
        }
    });
    const metre = 1000 * scale;
    page.drawLine({
        start: { x: originX, y: originY - 22 },
        end: { x: originX + metre, y: originY - 22 },
        thickness: 2,
        color: NAVY,
    });
    page.drawText('Scale bar: 1 m. Display scale fits the sheet. Stored units remain millimetres.', {
        x: originX,
        y: originY - 40,
        size: 9,
        font,
        color: INK,
    });
    page.drawText('North is toward the top of this sheet. This drawing is planning geometry, not an engineering certification.', {
        x: 36,
        y: 36,
        size: 9,
        font,
        color: MUTED,
    });
}

async function buildPdf({ materials, furniture, instructions, property, context = {} }) {
    const doc = await PDFDocument.create();
    doc.setTitle(context.plan ? 'Project plan' : 'Home design instructions');
    doc.setAuthor('Saerbridge Source');
    doc.setSubject(context.plan ? 'Geometry-first project plan' : 'Concept home design instructions');

    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    if (context.plan) addBlueprintSheet(doc, font, bold, context.plan);
    const width = PAGE_WIDTH - MARGIN * 2;
    let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const nextPage = () => {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
    };

    const drawLines = (lines, textFont, size, color, gap) => {
        for (const line of lines) {
            const step = size + gap;
            if (y - step < 72) nextPage();
            if (line) {
                page.drawText(line, {
                    x: MARGIN,
                    y: y - size,
                    size,
                    font: textFont,
                    color,
                });
            }
            y -= step;
        }
    };

    drawLines(['SAERBRIDGE | source.'], bold, 11, MUTED, 4);
    drawLines([context.renovation ? 'Renovation concept' : 'Home concept'], bold, 22, NAVY, 10);
    y -= 4;
    if (context.area) {
        drawLines(wrap(`Approximate area: ${sanitize(context.area)}`, font, 11, width), font, 11, INK, 4);
        y -= 8;
    }
    if (context.renovation) {
        drawLines(['EXISTING STRUCTURE'], bold, 14, NAVY, 6);
        drawLines(wrap('The concept starts from the uploaded photograph. Useful parts of the existing building should be kept where they are sound. The photograph is not a survey.', font, 11, width), font, 11, INK, 4);
        y -= 8;
    }
    drawLines(wrap(instructions.summary, font, 11, width), font, 11, INK, 4);
    y -= 12;

    const propertyLines = propertyPdfLines(property);
    if (propertyLines.length) {
        propertyLines.forEach((line, index) => {
            const isHeading = index === 0;
            drawLines(wrap(line, isHeading ? bold : font, isHeading ? 14 : 11, width), isHeading ? bold : font, isHeading ? 14 : 11, isHeading ? NAVY : INK, isHeading ? 6 : 4);
        });
        y -= 10;
    }

    const drawInventory = (heading, items) => {
        drawLines([heading], bold, 14, NAVY, 6);
        const entries = counts(items);
        const text = entries.length
            ? entries.map(([label, count]) => `${count} x ${label}`).join('\n')
            : 'None selected.';
        drawLines(wrap(text, font, 11, width), font, 11, INK, 3);
        y -= 10;
    };

    drawInventory('Materials', materials);
    drawInventory('Furniture and interior', furniture);

    for (const section of instructions.sections) {
        drawLines([section.heading], bold, 14, NAVY, 6);
        drawLines(wrap(section.body, font, 11, width), font, 11, INK, 4);
        y -= 10;
    }

    costPdfLines(context.cost).forEach((line, index) => {
        const isHeading = index === 0;
        drawLines(wrap(line, isHeading ? bold : font, isHeading ? 14 : 11, width), isHeading ? bold : font, isHeading ? 14 : 11, isHeading ? NAVY : INK, isHeading ? 6 : 4);
    });
    y -= 8;
    drawLines(['IMPORTANT LIMITATIONS'], bold, 14, NAVY, 6);
    drawLines(wrap('Concept guidance only. Not a construction document. Costs are planning estimates and may change. Supplier prices and availability should be confirmed before purchase. Dimensions supplied by the user have not been surveyed or independently verified. Local building requirements and approvals must be checked before construction.', font, 11, width), font, 11, INK, 4);

    const pages = doc.getPages();
    pages.forEach((pdfPage, index) => {
        pdfPage.drawText('Concept guidance only. Not a construction document.', {
            x: MARGIN,
            y: 36,
            size: 8,
            font,
            color: MUTED,
        });
        const pageLabel = `${index + 1} / ${pages.length}`;
        const labelWidth = font.widthOfTextAtSize(pageLabel, 9);
        pdfPage.drawText(pageLabel, {
            x: PAGE_WIDTH - MARGIN - labelWidth,
            y: 32,
            size: 9,
            font,
            color: MUTED,
        });
    });

    const bytes = await doc.save();
    return Buffer.from(bytes).toString('base64');
}

async function createHomeDesign({ materials, furniture, property }) {
    const [image, instructions] = await Promise.all([
        createImage(materials, furniture, property),
        createInstructions(materials, furniture, property),
    ]);
    const pdf = await buildPdf({ materials, furniture, instructions, property });
    return { image, pdf };
}

module.exports = {
    createHomeDesign,
    imageModels,
    textModels,
    openai,
    createConceptImage: createImage,
    createRenovationImage,
    createInstructions,
    buildPdf,
    complexModels,
};
