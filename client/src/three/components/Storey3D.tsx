import type { SceneSpec } from '../sceneTypes';
import { bindingMaterial } from '../materials/MaterialRegistry';
import Door3D from './Door3D';
import Fixture3D from './Fixture3D';
import Floor3D from './Floor3D';
import Furniture3D from './Furniture3D';
import Roof3D from './Roof3D';
import Wall3D from './Wall3D';
import Window3D from './Window3D';

type Storey3DProps = {
    scene: SceneSpec;
    showRoof: boolean;
    showFurniture: boolean;
    shadows: boolean;
};

function Storey3D({ scene, showRoof, showFurniture, shadows }: Storey3DProps) {
    const wallMaterial = bindingMaterial(scene.materialBindings, 'wall');
    const floorMaterial = bindingMaterial(scene.materialBindings, 'floor');
    const roofMaterial = bindingMaterial(scene.materialBindings, 'roof');
    const doorMaterial = bindingMaterial(scene.materialBindings, 'door');
    const windowMaterial = bindingMaterial(scene.materialBindings, 'window');
    const wallsById = new Map(scene.walls.map((wall) => [wall.id, wall]));
    return (
        <group name='storey-1'>
            {scene.floors.map((floor) => <Floor3D key={floor.id} floor={floor} material={floorMaterial} shadows={shadows} />)}
            {scene.walls.map((wall) => <Wall3D key={wall.id} wall={wall} material={wallMaterial} shadows={shadows} />)}
            {scene.doors.map((opening) => {
                const wall = wallsById.get(opening.wallId);
                return wall ? <Door3D key={opening.id} wall={wall} opening={opening} material={doorMaterial} shadows={shadows} /> : null;
            })}
            {scene.windows.map((opening) => {
                const wall = wallsById.get(opening.wallId);
                return wall ? <Window3D key={opening.id} wall={wall} opening={opening} material={windowMaterial} /> : null;
            })}
            {showRoof ? scene.roofs.map((roof) => <Roof3D key={roof.type} roof={roof} material={roofMaterial} shadows={shadows} />) : null}
            {showFurniture ? scene.furniture.map((item) => <Furniture3D key={item.id} item={item} shadows={shadows} />) : null}
            {showFurniture ? scene.fixtures.map((item) => <Fixture3D key={item.id} item={item} shadows={shadows} />) : null}
        </group>
    );
}

export default Storey3D;
