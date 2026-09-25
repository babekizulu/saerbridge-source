import { memo } from 'react';
import type { MeshStandardMaterial } from 'three';
import type { SceneOpening, SceneSpec } from '../sceneTypes';
import { openingTransform } from '../geometry/wallGeometry';
import { toWorld } from '../utils/units';

function Door3D({ wall, opening, material, shadows }: { wall: SceneSpec['walls'][number]; opening: SceneOpening; material: MeshStandardMaterial; shadows: boolean }) {
    const placed = openingTransform(wall, opening);
    const size: [number, number, number] = [placed.size[0] * 0.92, placed.size[1] * 0.96, toWorld(40)];
    return (
        <mesh name={opening.id} position={placed.position} rotation={[0, placed.rotationY, 0]} material={material} castShadow={shadows}>
            <boxGeometry args={size} />
        </mesh>
    );
}

export default memo(Door3D);
