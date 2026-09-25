import { useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import type { SceneSpec } from '../sceneTypes';
import { toWorld } from '../utils/units';

export type CameraView = 'perspective' | 'top' | 'front' | 'rear' | 'left' | 'right';

type CameraControlsProps = {
    hints: NonNullable<SceneSpec['cameraHints']>;
    view: CameraView;
    resetToken: number;
};

function CameraControls({ hints, view, resetToken }: CameraControlsProps) {
    const camera = useThree((state) => state.camera);
    const targetX = toWorld(hints.target.xMm);
    const targetY = toWorld(hints.target.elevationMm);
    const targetZ = toWorld(hints.target.yMm);
    const distance = toWorld(hints.radiusMm);

    useEffect(() => {
        const offset = {
            perspective: [distance * 0.85, distance * 0.55, distance * 0.85],
            top: [0, distance * 1.2, 0.01],
            front: [0, distance * 0.28, distance],
            rear: [0, distance * 0.28, -distance],
            left: [-distance, distance * 0.28, 0],
            right: [distance, distance * 0.28, 0],
        }[view];
        camera.position.set(targetX + offset[0], targetY + offset[1], targetZ + offset[2]);
        camera.lookAt(targetX, targetY, targetZ);
        camera.updateProjectionMatrix();
    }, [camera, view, resetToken, distance, targetX, targetY, targetZ]);

    return <OrbitControls makeDefault enableDamping target={[targetX, targetY, targetZ]} />;
}

export default CameraControls;
