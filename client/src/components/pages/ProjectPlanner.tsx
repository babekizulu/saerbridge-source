import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { requestHomeDesign, type DesignResult } from '../../api/homeDesign';
import type { DesignItem, PlacedItem } from '../../data/designItems';
import { plannerKey, type PropertyDimensions as PropertyValue } from '../../property';
import DesignBox from '../DesignBox';
import { initialProgress, type ProgressState } from '../../progressSteps';
import ItemPalette from '../ItemPalette';
import LocationField, { type Coordinates, type ManualLocation } from '../LocationField';
import PropertyDimensions from '../PropertyDimensions';
import ResidenceChoice, { type ResidenceType } from '../ResidenceChoice';
import ResultStudio from '../ResultStudio';
import SitePhoto, { type SitePhotoValue } from '../SitePhoto';

const emptyManual: ManualLocation = { suburb: '', city: '', province: '' };

function areaText(manual: ManualLocation) {
    return [manual.suburb, manual.city, manual.province].map((part) => part.trim()).filter(Boolean).join(', ');
}

function inputContext(
    photo: SitePhotoValue | null,
    manual: ManualLocation,
    coordinates: Coordinates | null,
    residence: ResidenceType | null,
    concept: string,
) {
    const lat = coordinates ? coordinates.latitude.toFixed(2) : '';
    const lon = coordinates ? coordinates.longitude.toFixed(2) : '';
    return {
        imageId: photo?.id || '',
        includePhoto: Boolean(photo?.consent),
        location: `${areaText(manual)}|${lat}|${lon}`,
        residence: residence || '',
        concept,
    };
}

function ProjectPlanner() {
    const [items, setItems] = useState<PlacedItem[]>([]);
    const [property, setProperty] = useState<PropertyValue | null>(null);
    const [photo, setPhoto] = useState<SitePhotoValue | null>(null);
    const [manual, setManual] = useState<ManualLocation>(emptyManual);
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [residence, setResidence] = useState<ResidenceType | null>(null);
    const [conceptName, setConceptName] = useState('');
    const [studioOpen, setStudioOpen] = useState(false);
    const [studioPanel, setStudioPanel] = useState<'image' | 'blueprint' | 'model' | 'pdf' | 'sheet'>('image');
    const [newRow, setNewRow] = useState(false);
    const [result, setResult] = useState<DesignResult | null>(null);
    const [status, setStatus] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle');
    const [progress, setProgress] = useState(initialProgress());
    const [announcement, setAnnouncement] = useState('');
    const requestId = useRef(0);
    const requestKey = useRef<string | null>(null);
    const resultKey = useRef<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const previewRef = useRef('');
    const fileUrls = useRef<string[]>([]);
    const conceptRef = useRef('');

    useEffect(() => {
        if (!studioOpen) return;
        const previous = document.activeElement as HTMLElement | null;
        const panel = document.getElementById('design-result');
        const background = document.querySelectorAll<HTMLElement>('.planner-main, .header, .sidebar, .site-footer');
        background.forEach((node) => { node.inert = true; });
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        panel?.querySelector<HTMLButtonElement>('.studio-close')?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setStudioOpen(false);
            if (event.key !== 'Tab' || !panel) return;
            const nodes = [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), summary, select, textarea, iframe, object, [tabindex="0"]')].filter((node) => node.getClientRects().length);
            const first = nodes[0], last = nodes[nodes.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = overflow;
            background.forEach((node) => { node.inert = false; });
            document.removeEventListener('keydown', onKey);
            if (previous?.isConnected) previous.focus();
        };
    }, [studioOpen]);

    const releaseFiles = () => {
        fileUrls.current.forEach((url) => URL.revokeObjectURL(url));
        fileUrls.current = [];
    };

    const keepFiles = (next: DesignResult) => {
        releaseFiles();
        fileUrls.current = [next.pdfUrl, next.spreadsheetUrl].filter((url) => url.startsWith('blob:'));
    };

    useEffect(() => () => {
        requestId.current += 1;
        abortRef.current?.abort();
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        fileUrls.current.forEach((url) => URL.revokeObjectURL(url));
    }, []);

    const dropStaleOutput = (
        nextItems: PlacedItem[],
        nextProperty: PropertyValue | null,
        nextPhoto: SitePhotoValue | null,
        nextManual: ManualLocation,
        nextCoordinates: Coordinates | null,
        nextResidence: ResidenceType | null,
    ) => {
        const nextKey = plannerKey(nextItems, nextProperty, inputContext(nextPhoto, nextManual, nextCoordinates, nextResidence, conceptRef.current));
        const requestStale = requestKey.current !== null && requestKey.current !== nextKey;
        const resultStale = resultKey.current !== null && resultKey.current !== nextKey;
        if (!requestStale && !resultStale) return false;
        requestId.current += 1;
        abortRef.current?.abort();
        abortRef.current = null;
        requestKey.current = null;
        resultKey.current = null;
        releaseFiles();
        setResult(null);
        setStatus('idle');
        return true;
    };

    const changePhoto = (next: SitePhotoValue | null) => {
        if (previewRef.current && previewRef.current !== (next?.previewUrl || '')) {
            URL.revokeObjectURL(previewRef.current);
        }
        previewRef.current = next?.previewUrl || '';
        const cleared = dropStaleOutput(items, property, next, manual, coordinates, residence);
        setPhoto(next);
        if (!next) {
            setAnnouncement(cleared
                ? 'Photograph removed. Any design based on it was cleared.'
                : 'Photograph removed.');
            return;
        }
        if (photo && next.id === photo.id) {
            setAnnouncement(next.consent
                ? 'Photograph permission saved. Nothing is sent until you generate.'
                : 'Photograph permission removed. The photograph will not be sent.');
            return;
        }
        setAnnouncement(cleared
            ? 'Photograph added. Grant permission before it is sent. The previous design was cleared.'
            : 'Photograph added. Grant permission before it is sent.');
    };

    const updateItems = (next: PlacedItem[]) => {
        const removed = items.filter((item) => !next.some((candidate) => candidate.id === item.id));
        const added = next.filter((item) => !items.some((candidate) => candidate.id === item.id));
        const clearedDesign = dropStaleOutput(next, property, photo, manual, coordinates, residence);
        setItems(next);
        if (next.length === 0) {
            setNewRow(false);
            setAnnouncement(photo?.consent
                ? 'Design box cleared. The photograph can still generate a renovation concept.'
                : 'Design box cleared. The generated design was removed.');
            return;
        }
        if (removed.length === 1) {
            setAnnouncement(clearedDesign
                ? `${removed[0].label} removed. The generated design was cleared.`
                : `${removed[0].label} removed.`);
            return;
        }
        if (added.length === 1) {
            const placed = added[0].rowBreak
                ? `${added[0].label} added on a new row.`
                : `${added[0].label} added to the design box.`;
            setAnnouncement(clearedDesign
                ? `${placed} The generated design was cleared. Nothing is sent until you generate.`
                : `${placed} Nothing is sent until you generate.`);
        }
    };

    const addItem = (item: DesignItem) => {
        const startRow = newRow && items.length > 0;
        const next = [
            ...items,
            {
                id: crypto.randomUUID(),
                type: item.type,
                category: item.category,
                label: item.label,
                rowBreak: startRow,
            },
        ];
        const clearedDesign = dropStaleOutput(next, property, photo, manual, coordinates, residence);
        setItems(next);
        const placed = startRow
            ? `${item.label} added on a new row.`
            : `${item.label} added to the design box.`;
        setAnnouncement(clearedDesign
            ? `${placed} The generated design was cleared. Nothing is sent until you generate.`
            : `${placed} Nothing is sent until you generate.`);
    };

    const updateProperty = (next: PropertyValue | null) => {
        const clearedDesign = dropStaleOutput(items, next, photo, manual, coordinates, residence);
        setProperty(next);
        setAnnouncement(clearedDesign
            ? 'Property dimensions updated. The generated design was cleared.'
            : next ? 'Property dimensions saved. Nothing is sent until you generate.' : 'Property dimensions cleared.');
    };

    const updateManual = (next: ManualLocation) => {
        dropStaleOutput(items, property, photo, next, coordinates, residence);
        setManual(next);
    };

    const updateCoordinates = (next: Coordinates | null) => {
        dropStaleOutput(items, property, photo, manual, next, residence);
        setCoordinates(next);
    };

    const updateResidence = (next: ResidenceType | null) => {
        const clearedDesign = dropStaleOutput(items, property, photo, manual, coordinates, next);
        setResidence(next);
        setAnnouncement(clearedDesign
            ? 'Residence type updated. The generated design was cleared.'
            : next ? 'Residence type saved. Nothing is sent until you generate.' : 'Residence type cleared.');
    };

    const uploadDesign = async () => {
        const includePhoto = Boolean(photo?.consent);
        if ((items.length === 0 && !includePhoto) || status === 'generating') return;
        const key = plannerKey(items, property, inputContext(photo, manual, coordinates, residence, conceptName));
        const id = requestId.current + 1;
        requestId.current = id;
        requestKey.current = key;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        releaseFiles();
        setResult(null);
        setProgress(initialProgress(includePhoto ? 'renovation' : 'plan'));
        setStatus('generating');
        setStudioPanel('image');
        setStudioOpen(true);
        setAnnouncement('Generating your home design.');
        const area = areaText(manual);
        try {
            const next = await requestHomeDesign({
                items,
                property,
                residence,
                location: area || coordinates
                    ? { area: area || undefined, latitude: coordinates?.latitude, longitude: coordinates?.longitude }
                    : null,
                conceptName: conceptName.trim() || undefined,
                photo: includePhoto ? photo?.upload : null,
                signal: controller.signal,
                onProgress: (step, state) => {
                    if (requestId.current !== id) return;
                    setProgress((current) => current.map((item) => (
                        item.id === step ? { ...item, state: state as ProgressState } : item
                    )));
                },
            });
            if (requestId.current !== id || requestKey.current !== key || controller.signal.aborted) {
                [next.pdfUrl, next.spreadsheetUrl].forEach((url) => {
                    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                });
                return;
            }
            resultKey.current = key;
            keepFiles(next);
            setResult(next);
            setStatus('ready');
            const notes = [
                next.renovationMode
                    ? 'Your renovation concept is ready.'
                : 'Your home design is ready.',
                next.pdfStatus === 'ok' ? 'The project report is available.' : next.pdfStatus === 'skipped' ? '' : 'The project report is temporarily unavailable.',
                next.supplierStatus === 'unavailable' ? 'Local supplier information is temporarily unavailable.' : '',
                next.spreadsheetStatus === 'ok' || next.spreadsheetStatus === 'skipped' ? '' : 'The quantity CSV could not be prepared.',
            ].filter(Boolean);
            setAnnouncement(notes.join(' '));
        } catch (error) {
            if (axios.isCancel(error) || controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
            if (requestId.current !== id || requestKey.current !== key) return;
            setStatus('error');
            setAnnouncement('The design could not be generated.');
        }
    };

    const includePhoto = Boolean(photo?.consent);
    const canGenerate = items.length > 0 || includePhoto;
    const countLabel = items.length === 1
        ? '1 item in the design box'
        : `${items.length} items in the design box`;

    return (
        <div className='project-planner'>
            <div className='planner-main'>
            <div className='planner-intro' id='planner-intro'>
                <h1>Project planner</h1>
                <p>Plan a home with materials and furniture, or explore a renovation from a photograph you have permission to use.</p>
                <details className='planner-howto'><summary>How it works</summary>
                    <p>Add your project details and select items below. Generate when you are ready; you can edit your selection at any time.</p>
                </details>
                <label className='concept-name'>
                    Concept name
                    <input
                        type='text'
                        maxLength={80}
                        value={conceptName}
                        placeholder='Name this concept'
                        onChange={(event) => {
                            const next = event.target.value;
                            conceptRef.current = next;
                            dropStaleOutput(items, property, photo, manual, coordinates, residence);
                            setConceptName(next);
                        }}
                    />
                </label>

            </div>
            <div className='planner-cards'>
                <ResidenceChoice value={residence} onChange={updateResidence} />
                <PropertyDimensions value={property} onChange={updateProperty} />
                <LocationField
                    manual={manual}
                    coordinates={coordinates}
                    onManual={updateManual}
                    onCoordinates={updateCoordinates}
                />
            </div>
            <section className='design-tools' id='selection' aria-label='Selection tools'>
                <label className='row-toggle'>
                    <input
                        type='checkbox'
                        checked={newRow}
                        disabled={items.length === 0}
                        onChange={(event) => setNewRow(event.target.checked)}
                    />
                    Add on a new row
                </label>
                <p className='design-count'>{items.length === 0 ? 'Nothing in the design box yet' : countLabel}</p>
            </section>
            <SitePhoto value={photo} onChange={changePhoto} />
            {photo && !photo.consent && items.length === 0 ? (
                <p className='generate-hint' role='status'>
                    Grant permission before this photograph can generate a renovation concept.
                </p>
            ) : null}
            {photo && !photo.consent && items.length > 0 ? (
                <p className='generate-hint'>
                    Selected materials can generate a home concept. The photograph is not included until you grant permission.
                </p>
            ) : null}
            <DesignBox
                items={items}
                onChange={updateItems}
                onUpload={uploadDesign}
                uploading={status === 'generating'}
                showGenerate={canGenerate || status === 'generating'}
                onClear={() => updateItems([])}
            />
            <ItemPalette onAdd={addItem} />
            </div>

            <aside className={studioOpen ? 'results-sidebar is-expanded' : 'results-sidebar'} id='design-result' role={studioOpen ? 'dialog' : undefined} aria-modal={studioOpen || undefined} aria-labelledby='design-result-heading' tabIndex={-1}>
                <h2 id='design-result-heading' className='visually-hidden'>Design</h2>
                <ResultStudio
                    open={studioOpen}
                    panel={studioPanel}
                    onOpen={(next) => {
                        setStudioPanel(next);
                        setStudioOpen(true);
                    }}
                    onClose={() => setStudioOpen(false)}
                    result={result}
                    status={status}
                    progress={progress}
                    origin={coordinates}
                />
            </aside>
            <div className='visually-hidden' aria-live='polite' aria-atomic='true'>
                {announcement}
            </div>
        </div>
    );
}

export default ProjectPlanner;
