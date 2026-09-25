import type { SceneSpec } from '../sceneTypes';
import { bindingMaterial } from '../materials/MaterialRegistry';
import Site3D from './Site3D';
import Storey3D from './Storey3D';

type Building3DProps = {
    scene: SceneSpec;
    showRoof: boolean;
    showFurniture: boolean;
    shadows: boolean;
};

function Building3D({ scene, showRoof, showFurniture, shadows }: Building3DProps) {
    if (!scene.site) return null;
    return (
        <group name={scene.projectId}>
            <Site3D site={scene.site} material={bindingMaterial(scene.materialBindings, 'ground')} />
            <Storey3D scene={scene} showRoof={showRoof} showFurniture={showFurniture} shadows={shadows} />
        </group>
    );
}

export default Building3D;
