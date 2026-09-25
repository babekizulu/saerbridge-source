import { BufferAttribute, BufferGeometry } from 'three';
import type { SceneSpec } from '../sceneTypes';
import { toWorld } from '../utils/units';

export function roofGeometry(plane: SceneSpec['roofs'][number]['planes'][number]) {
    const positions = new Float32Array(plane.points.length * 3);
    plane.points.forEach((point, index) => {
        positions[index * 3] = toWorld(point.xMm);
        positions[index * 3 + 1] = toWorld(point.elevationMm);
        positions[index * 3 + 2] = toWorld(point.yMm);
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    const indices = plane.points.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2];
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
}
