import type { SceneSpec } from '../sceneTypes';
import { toWorld } from '../utils/units';

export function floorTransform(floor: SceneSpec['floors'][number]) {
    const xs = floor.polygon.map((point) => point.xMm);
    const ys = floor.polygon.map((point) => point.yMm);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
        position: [
            toWorld((minX + maxX) / 2),
            toWorld(-floor.thicknessMm / 2),
            toWorld((minY + maxY) / 2),
        ] as [number, number, number],
        size: [
            toWorld(maxX - minX),
            toWorld(floor.thicknessMm),
            toWorld(maxY - minY),
        ] as [number, number, number],
    };
}
