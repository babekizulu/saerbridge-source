export const materialDefinitions = {
    'concrete-block-painted': { color: '#d9d3c5', roughness: 0.92, metalness: 0 },
    'clay-brick': { color: '#a35b45', roughness: 0.88, metalness: 0 },
    'corrugated-galvanized-steel': { color: '#9aa3ab', roughness: 0.42, metalness: 0.55 },
    'treated-timber': { color: '#8d5b34', roughness: 0.82, metalness: 0 },
    'painted-plaster': { color: '#f3efe4', roughness: 0.94, metalness: 0 },
    glass: { color: '#c5d8e4', roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.45 },
    ground: { color: '#c5d0b8', roughness: 1, metalness: 0 },
} as const;

export type MaterialId = keyof typeof materialDefinitions;
