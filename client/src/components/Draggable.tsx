import type { DragEvent } from 'react';
import { useRef } from 'react';
import type { DesignItem, PlacedItem } from '../data/designItems';
import DesignIcon from './DesignIcon';

type DraggableProps = {
    item: DesignItem | PlacedItem;
    placed?: boolean;
    onRemove?: (id: string) => void;
    onAdd?: (item: DesignItem) => void;
    shaking?: boolean;
};

function Draggable({ item, placed = false, onRemove, onAdd, shaking = false }: DraggableProps) {
    const dragged = useRef(false);

    const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
        dragged.current = true;
        const payload = JSON.stringify({
            type: item.type,
            category: item.category,
            label: item.label,
        });
        event.dataTransfer.setData('application/json', payload);
        event.dataTransfer.setData('text/plain', payload);
        event.dataTransfer.effectAllowed = 'copy';
    };

    if (placed) {
        return (
            <div className='draggable is-placed'>
                <span className='draggable-icon' aria-hidden='true'>
                    <DesignIcon type={item.type} category={item.category} />
                </span>
                <span>{item.label}</span>
                {onRemove && 'id' in item ? (
                    <button
                        type='button'
                        className='draggable-remove'
                        aria-label={`Remove ${item.label}`}
                        onClick={() => onRemove(item.id)}
                    >
                        ×
                    </button>
                ) : null}
            </div>
        );
    }

    return (
        <button
            type='button'
            className={shaking ? 'draggable is-shaking' : 'draggable'}
            draggable
            aria-label={`Add ${item.label} to the design box`}
            onDragStart={handleDragStart}
            onDragEnd={() => {
                window.setTimeout(() => {
                    dragged.current = false;
                }, 100);
            }}
            onClick={() => {
                if (dragged.current) return;
                onAdd?.(item);
            }}
        >
            <span className='draggable-icon' aria-hidden='true'>
                <DesignIcon type={item.type} category={item.category} />
            </span>
            <span>{item.label}</span>
        </button>
    );
}

export default Draggable;
