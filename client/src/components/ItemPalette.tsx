import { useState } from 'react';
import { furnitureGroups, materialGroups, type DesignItem } from '../data/designItems';
import Draggable from './Draggable';

type ItemPaletteProps = {
    onAdd: (item: DesignItem) => void;
};

function ItemPalette({ onAdd }: ItemPaletteProps) {
    const [shaking, setShaking] = useState('');
    const add = (item: DesignItem) => {
        setShaking(item.type);
        window.setTimeout(() => setShaking((current) => (current === item.type ? '' : current)), 400);
        onAdd(item);
    };
    return (
        <section className='item-palette' id='materials' aria-label='Materials and furniture'>
            <h2 id='materials-heading'>Building materials</h2>
            <p className='palette-hint'>Open a category, then tap or drag a material.</p>
            {materialGroups.map((group, index) => (
                <details key={group.id} className='palette-group' open={index === 0}>
                    <summary>{group.label}</summary>
                    <div className='item-palette-grid'>
                        {group.items.map((item) => (
                            <Draggable key={item.type} item={item} shaking={shaking === item.type} onAdd={add} />
                        ))}
                    </div>
                </details>
            ))}
            <h2 id='furniture-heading'>Furniture and interior</h2>
            <p className='palette-hint'>Open a category, then tap or drag a furniture item.</p>
            {furnitureGroups.map((group) => (
                <details key={group.id} className='palette-group'>
                    <summary>{group.label}</summary>
                    <div className='item-palette-grid'>
                        {group.items.map((item) => (
                            <Draggable key={item.type} item={item} shaking={shaking === item.type} onAdd={add} />
                        ))}
                    </div>
                </details>
            ))}
        </section>
    );
}

export default ItemPalette;
