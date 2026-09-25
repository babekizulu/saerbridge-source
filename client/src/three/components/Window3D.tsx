import { memo } from 'react';
import type { MeshStandardMaterial } from 'three';
import type { SceneOpening, SceneSpec } from '../sceneTypes';
import { openingTransform } from '../geometry/wallGeometry';
import { toWorld } from '../utils/units';

function Window3D({ wall, opening, material }: { wall: SceneSpec['walls'][number]; opening: SceneOpening; material: MeshStandardMaterial }) {
    const placed = openingTransform(wall, opening);
    const size: [number, number, number] = [placed.size[0] * 0.9, placed.size[1] * 0.9, toWorld(20)];
    return (
        <mesh name={opening.id} position={placed.position} rotation={[0, placed.rotationY, 0]} material={material}>
            <boxGeometry args={size} />
        </mesh>
    );
}

export default memo(Window3D);
