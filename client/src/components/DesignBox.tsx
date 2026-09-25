import { Fragment, useEffect, useState } from 'react';
import type { DragEvent } from 'react';
import { FiMove } from 'react-icons/fi';
import { materialGroups, furnitureGroups, type PlacedItem } from '../data/designItems';
const catalogItems = [...materialGroups, ...furnitureGroups].flatMap((group) => group.items);
import Draggable from './Draggable';
import InfoTip from './InfoTip';
import SendBtn from './buttons/SendBtn';

type DesignBoxProps = {
    items: PlacedItem[];
    onChange: (items: PlacedItem[]) => void;
    onUpload: () => void;
    uploading?: boolean;
    showGenerate?: boolean;
    onClear?: () => void;
};

function isUnderPlacedItem(event: DragEvent<HTMLDivElement>) {
    const placed = event.currentTarget.querySelectorAll<HTMLElement>('.is-placed');
    for (const el of placed) {
        const rect = el.getBoundingClientRect();
        const inColumn = event.clientX >= rect.left - 16 && event.clientX <= rect.right + 16;
        const underneath = event.clientY >= rect.bottom - rect.height * 0.35;
        if (inColumn && underneath) return true;
    }
    return false;
}

function DesignBox({
    items,
    onChange,
    onUpload,
    uploading = false,
    showGenerate = false,
    onClear,
}: DesignBoxProps) {
    const [over, setOver] = useState(false);
    const [extending, setExtending] = useState(false);

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setOver(true);
        setExtending(isUnderPlacedItem(event));
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setOver(false);
        setExtending(false);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const underneath = isUnderPlacedItem(event);
        setOver(false);
        setExtending(false);
        const raw = event.dataTransfer.getData('application/json')
            || event.dataTransfer.getData('text/plain');
        if (!raw) return;

        try {
            if (raw.length > 1024) return;
            const candidate = JSON.parse(raw) as Partial<PlacedItem>;
            const item = catalogItems.find((entry) => entry.type === candidate.type && entry.category === candidate.category);
            if (!item) return;
            onChange([
                ...items,
                {
                    id: crypto.randomUUID(),
                    type: item.type,
                    category: item.category,
                    label: item.label,
                    rowBreak: underneath && items.length > 0,
                },
            ]);
        } catch {
            return;
        }
    };

    const handleRemove = (id: string) => {
        onChange(items.filter((item) => item.id !== id));
    };

    useEffect(() => {
        const onDragOver = (event: globalThis.DragEvent) => {
            const y = event.clientY;
            let delta = 0;
            if (y < 100) delta = -Math.ceil((100 - y) / 6);
            else if (y > window.innerHeight - 100) delta = Math.ceil((y - window.innerHeight + 100) / 6);

            if (delta) window.scrollBy(0, delta);
        };
        const reset = () => { setOver(false); setExtending(false); };
        window.addEventListener('dragover', onDragOver);
        window.addEventListener('dragend', reset);
        window.addEventListener('drop', reset);
        return () => { window.removeEventListener('dragover', onDragOver); window.removeEventListener('dragend', reset); window.removeEventListener('drop', reset); };
    }, []);

    const className = [
        'design-box',
        items.length > 0 ? 'has-items' : '',
        showGenerate ? 'can-generate' : '',
        over ? 'is-over' : '',
        extending ? 'is-extending' : '',
    ].filter(Boolean).join(' ');

    return (
        <div
            id='design-box'
            className={className}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role='region'
            aria-label='Design box'
            aria-busy={uploading}
        >
            <div className='design-box-heading'>
                <p className='design-box-placeholder'>
                    <FiMove aria-hidden='true' />
                    <strong>Tap items below or drag them here</strong>
                </p>
                <InfoTip label='About the design box'>
                    Drag a material or furniture item here, or click it in the list below. Nothing is sent until you choose Generate design. A photograph is sent only after you grant permission.
                </InfoTip>
            </div>
            {items.map((item) => (
                <Fragment key={item.id}>
                    {item.rowBreak ? <span className='design-box-break' /> : null}
                    <Draggable item={item} placed onRemove={handleRemove} />
                </Fragment>
            ))}
            {items.length > 0 ? (
                <button type='button' className='tool-btn design-box-clear' onClick={onClear}>
                    Clear
                </button>
            ) : null}
            {showGenerate ? (
                <SendBtn onClick={onUpload} disabled={uploading} />
            ) : null}
        </div>
    );
}

export default DesignBox;
