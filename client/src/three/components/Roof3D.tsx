import { memo, useMemo } from 'react';
import type { MeshStandardMaterial } from 'three';
import type { SceneSpec } from '../sceneTypes';
import { roofGeometry } from '../geometry/roofGeometry';

function Roof3D({ roof, material, shadows }: { roof: SceneSpec['roofs'][number]; material: MeshStandardMaterial; shadows: boolean }) {
    const geometries = useMemo(() => roof.planes.map((plane) => roofGeometry(plane)), [roof]);
    return (
        <group name={`roof-${roof.type}`}>
            {geometries.map((geometry, index) => (
                <mesh key={roof.planes[index].id} geometry={geometry} material={material} castShadow={shadows} receiveShadow={shadows} />
            ))}
        </group>
    );
}

export default memo(Roof3D);
