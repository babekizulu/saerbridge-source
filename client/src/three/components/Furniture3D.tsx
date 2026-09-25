import { memo } from 'react';
import type { SceneFurniture } from '../sceneTypes';
import { materialFor } from '../materials/MaterialRegistry';
import { toWorld } from '../utils/units';

function Furniture3D({ item, shadows }: { item: SceneFurniture; shadows: boolean }) {
    const material = materialFor(item.materialId);
    return (
        <mesh
            name={item.id}
            position={[
                toWorld(item.xMm + item.widthMm / 2),
                toWorld(item.heightMm / 2),
                toWorld(item.yMm + item.depthMm / 2),
            ]}
            material={material}
            castShadow={shadows}
            receiveShadow={shadows}
        >
            <boxGeometry args={[toWorld(item.widthMm), toWorld(item.heightMm), toWorld(item.depthMm)]} />
        </mesh>
    );
}

export default memo(Furniture3D);
