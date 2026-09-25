import type { SceneOpening, SceneSpec } from '../sceneTypes';
import { toWorld } from '../utils/units';

type Segment = SceneSpec['walls'][number]['segments'][number];
type Wall = SceneSpec['walls'][number];

export function segmentTransform(wall: Wall, segment: Pick<Segment, 'offsetMm' | 'lengthMm' | 'bottomMm' | 'heightMm'>) {
    const dx = wall.end.xMm - wall.start.xMm;
    const dy = wall.end.yMm - wall.start.yMm;
    const length = Math.hypot(dx, dy) || 1;
    const along = segment.offsetMm + segment.lengthMm / 2;
    return {
        position: [
            toWorld(wall.start.xMm + (dx / length) * along),
            toWorld(segment.bottomMm + segment.heightMm / 2),
            toWorld(wall.start.yMm + (dy / length) * along),
        ] as [number, number, number],
        rotationY: Math.atan2(dy, dx),
        size: [
            toWorld(segment.lengthMm),
            toWorld(segment.heightMm),
            toWorld(wall.thicknessMm),
        ] as [number, number, number],
    };
}

export function openingTransform(wall: Wall, opening: SceneOpening) {
    return segmentTransform(wall, {
        offsetMm: opening.offsetFromWallStartMm,
        lengthMm: opening.widthMm,
        bottomMm: opening.sillHeightMm,
        heightMm: opening.heightMm,
    });
}
