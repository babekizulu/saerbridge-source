const fs = require('fs');

const text = fs.readFileSync('client/src/assets/icon_list.txt', 'utf8');
const lines = text.split(/\r?\n/);
let section = null;
let group = null;
const groups = { material: [], furniture: [] };

for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('BUILDING')) {
        section = 'material';
        group = null;
        continue;
    }
    if (trimmed.startsWith('FURNITURE')) {
        section = 'furniture';
        group = null;
        continue;
    }
    if (trimmed.startsWith('- ')) {
        const label = trimmed.slice(2);
        const type = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let bucket = groups[section].find((entry) => entry.label === group);
        if (!bucket) {
            bucket = {
                id: group.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                label: group,
                items: [],
            };
            groups[section].push(bucket);
        }
        bucket.items.push({ type, category: section, label });
    } else if (section) {
        group = trimmed;
    }
}

const header = `export type DesignCategory = 'material' | 'furniture';

export type DesignItem = {
    type: string;
    category: DesignCategory;
    label: string;
};

export type PlacedItem = DesignItem & {
    id: string;
    rowBreak?: boolean;
};

export type CatalogGroup = {
    id: string;
    label: string;
    items: DesignItem[];
};

export const materialGroups: CatalogGroup[] = ${JSON.stringify(groups.material, null, 4)};

export const furnitureGroups: CatalogGroup[] = ${JSON.stringify(groups.furniture, null, 4)};

export const materials: DesignItem[] = materialGroups.flatMap((group) => group.items);

export const furniture: DesignItem[] = furnitureGroups.flatMap((group) => group.items);
`;

fs.writeFileSync('client/src/data/designItems.ts', header);
console.log('material groups', groups.material.length, 'furniture groups', groups.furniture.length);
