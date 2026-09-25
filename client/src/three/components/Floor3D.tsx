import { memo } from 'react';
import type { MeshStandardMaterial } from 'three';
import type { SceneSpec } from '../sceneTypes';
import { floorTransform } from '../geometry/floorGeometry';

function Floor3D({ floor, material, shadows }: { floor: SceneSpec['floors'][number]; material: MeshStandardMaterial; shadows: boolean }) {
    const placed = floorTransform(floor);
    return (
        <mesh name={floor.id} position={placed.position} material={material} receiveShadow={shadows}>
            <boxGeometry args={placed.size} />
        </mesh>
    );
}

export default memo(Floor3D);
