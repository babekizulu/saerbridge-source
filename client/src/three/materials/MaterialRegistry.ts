import { MeshStandardMaterial } from 'three';
import { materialDefinitions, type MaterialId } from './materialDefinitions';

const cache = new Map<MaterialId, MeshStandardMaterial>();

export function materialFor(id: string) {
    const key: MaterialId = id in materialDefinitions ? id as MaterialId : 'painted-plaster';
    const existing = cache.get(key);
    if (existing) return existing;
    const definition = materialDefinitions[key];
    const material = new MeshStandardMaterial({
        color: definition.color,
        roughness: definition.roughness,
        metalness: definition.metalness,
        transparent: 'transparent' in definition ? definition.transparent : false,
        opacity: 'opacity' in definition ? definition.opacity : 1,
    });
    cache.set(key, material);
    return material;
}

export function bindingMaterial(bindings: { role: string; materialId: string }[], role: string) {
    return materialFor(bindings.find((binding) => binding.role === role)?.materialId || 'painted-plaster');
}
