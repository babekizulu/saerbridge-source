import type { MeshStandardMaterial } from 'three';
import type { SceneSpec } from '../sceneTypes';
import { toWorld } from '../utils/units';

function Site3D({ site, material }: { site: NonNullable<SceneSpec['site']>; material: MeshStandardMaterial }) {
    const width = Math.max(site.plotWidthMm, site.buildingWidthMm);
    const depth = Math.max(site.plotLengthMm, site.buildingLengthMm);
    return (
        <mesh name='site' rotation={[-Math.PI / 2, 0, 0]} position={[toWorld(width / 2), toWorld(-100), toWorld(depth / 2)]} material={material}>
            <planeGeometry args={[toWorld(width), toWorld(depth)]} />
        </mesh>
    );
}

export default Site3D;
