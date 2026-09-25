import type { SceneSpec } from './sceneTypes';
import type { GraphicsQuality } from './utils/performance';
import Building3D from './components/Building3D';
import CameraControls, { type CameraView } from './controls/CameraControls';

type ProjectSceneProps = {
    scene: SceneSpec;
    view: CameraView;
    resetToken: number;
    showRoof: boolean;
    showFurniture: boolean;
    quality: GraphicsQuality;
};

function ProjectScene({ scene, view, resetToken, showRoof, showFurniture, quality }: ProjectSceneProps) {
    if (!scene.cameraHints) return null;
    const shadows = quality !== 'LOW';
    return (
        <>
            <color attach='background' args={['#f7f4ea']} />
            <ambientLight intensity={quality === 'LOW' ? 0.85 : 0.55} />
            <directionalLight
                position={[8, 12, 6]}
                intensity={quality === 'LOW' ? 0.6 : 1.1}
                castShadow={shadows}
                shadow-mapSize-width={quality === 'HIGH' ? 1024 : 512}
                shadow-mapSize-height={quality === 'HIGH' ? 1024 : 512}
            />
            <Building3D scene={scene} showRoof={showRoof} showFurniture={showFurniture} shadows={shadows} />
            <CameraControls hints={scene.cameraHints} view={view} resetToken={resetToken} />
        </>
    );
}

export default ProjectScene;
