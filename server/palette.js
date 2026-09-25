const AUTO_MATERIALS = [
    { type: 'concrete', label: 'Concrete' },
    { type: 'clay-brick', label: 'Clay brick' },
    { type: 'corrugated-roofing', label: 'Corrugated roofing' },
    { type: 'timber', label: 'Timber' },
    { type: 'insulation-roll', label: 'Insulation roll' },
    { type: 'paint', label: 'Paint' },
    { type: 'glass-pane', label: 'Glass pane' },
    { type: 'timber-door', label: 'Timber door' },
];

function automaticMaterials() {
    return AUTO_MATERIALS.map((item) => ({ ...item }));
}

module.exports = {
    automaticMaterials,
};
