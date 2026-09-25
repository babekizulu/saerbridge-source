import { memo } from 'react';
import type { MeshStandardMaterial } from 'three';
import type { SceneSpec } from '../sceneTypes';
import { segmentTransform } from '../geometry/wallGeometry';

function Wall3D({ wall, material, shadows }: { wall: SceneSpec['walls'][number]; material: MeshStandardMaterial; shadows: boolean }) {
    return (
        <group name={wall.id}>
            {wall.segments.map((segment, index) => {
                const placed = segmentTransform(wall, segment);
                return (
                    <mesh
                        key={`${wall.id}-${index}`}
                        position={placed.position}
                        rotation={[0, placed.rotationY, 0]}
                        material={material}
                        castShadow={shadows}
                        receiveShadow={shadows}
                    >
                        <boxGeometry args={placed.size} />
                    </mesh>
                );
            })}
        </group>
    );
}

export default memo(Wall3D);
