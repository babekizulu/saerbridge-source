import type { SceneSpec } from '../sceneTypes';
import { toWorld } from './units';

export function sceneBounds(scene: SceneSpec) {
    if (!scene.site) return null;
    return {
        width: toWorld(scene.site.buildingWidthMm),
        depth: toWorld(scene.site.buildingLengthMm),
        plotWidth: toWorld(scene.site.plotWidthMm),
        plotDepth: toWorld(scene.site.plotLengthMm),
    };
}
