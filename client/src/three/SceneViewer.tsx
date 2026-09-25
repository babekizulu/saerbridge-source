import { Component, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import type { SceneSpec } from './sceneTypes';
import ProjectScene from './ProjectScene';
import SceneToolbar from './controls/SceneToolbar';
import type { CameraView } from './controls/CameraControls';
import { sceneBounds } from './utils/bounds';
import { exportSceneGlb } from './utils/exportScene';
import { createProjectRenderer, qualitySettings, type GraphicsQuality } from './utils/performance';

type SceneViewerProps = {
    scene: SceneSpec;
};

type BoundaryProps = { children: ReactNode; fallback: ReactNode };
type BoundaryState = { failed: boolean };

class SceneBoundary extends Component<BoundaryProps, BoundaryState> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (this.state.failed) return this.props.fallback;
        return this.props.children;
    }
}

function metres(mm: number) {
    return (Math.round((mm / 1000) * 100) / 100).toString();
}

function SceneViewer({ scene }: SceneViewerProps) {
    const [view, setView] = useState<CameraView>('perspective');
    const [resetToken, setResetToken] = useState(0);
    const [quality, setQuality] = useState<GraphicsQuality>('BALANCED');
    const [showRoof, setShowRoof] = useState(true);
    const [showFurniture, setShowFurniture] = useState(true);
    const [showDimensions, setShowDimensions] = useState(false);
    const [backend, setBackend] = useState('starting');
    const [exportNote, setExportNote] = useState('');
    const settings = qualitySettings(quality);
    const bounds = sceneBounds(scene);
    const unavailable = scene.renderStatus === 'UNAVAILABLE' || !scene.site;

    const download = async () => {
        try {
            const binary = await exportSceneGlb(scene);
            const url = URL.createObjectURL(new Blob([binary], { type: 'model/gltf-binary' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `${scene.projectId}-rev-${scene.projectRevision}.glb`;
            link.click();
            URL.revokeObjectURL(url);
            setExportNote('');
        } catch {
            setExportNote('The GLB file could not be prepared. The blueprint is unchanged.');
        }
    };

    return (
        <section className='scene-viewer' aria-labelledby='scene-heading'>
            <h3 id='scene-heading'>3D model</h3>
            <p>
                Project {scene.projectId}, revision {scene.projectRevision}. This view uses the same plan as the blueprint.
                {scene.renderStatus === 'COMPLETE_WITH_WARNINGS' ? ' Some parts are omitted.' : ''}
            </p>
            {scene.warnings.length ? (
                <ul>
                    {scene.warnings.map((warning) => <li key={`${warning.code}-${warning.message}`}>{warning.message}</li>)}
                </ul>
            ) : null}
            {unavailable ? <p>The 3D model was not built because the dwelling footprint is not ready.</p> : (
                <>
                    <SceneToolbar
                        view={view}
                        quality={quality}
                        showRoof={showRoof}
                        showFurniture={showFurniture}
                        showDimensions={showDimensions}
                        onView={setView}
                        onQuality={setQuality}
                        onRoof={() => setShowRoof((value) => !value)}
                        onFurniture={() => setShowFurniture((value) => !value)}
                        onDimensions={() => setShowDimensions((value) => !value)}
                        onReset={() => {
                            setView('perspective');
                            setResetToken((value) => value + 1);
                        }}
                        onExport={download}
                    />
                    <SceneBoundary fallback={<p role='alert'>The 3D view could not start. The blueprint, quantities, and costs are unchanged.</p>}>
                        <Canvas
                            className='scene-canvas'
                            dpr={settings.dpr}
                            shadows={settings.shadows}
                            camera={{ fov: 45, near: 0.1, far: 200, position: [8, 6, 8] }}
                            gl={createProjectRenderer}
                            onCreated={({ gl }) => setBackend(gl.constructor.name.includes('WebGPU') ? 'webgpu' : 'webgl2')}
                        >
                            <ProjectScene
                                scene={scene}
                                view={view}
                                resetToken={resetToken}
                                showRoof={showRoof}
                                showFurniture={showFurniture}
                                quality={quality}
                            />
                        </Canvas>
                    </SceneBoundary>
                    {showDimensions && scene.site ? (
                        <p>
                            Dwelling {metres(scene.site.buildingWidthMm)} m by {metres(scene.site.buildingLengthMm)} m, {scene.site.buildingAreaMm2 / 1_000_000} m².
                            Plot {metres(scene.site.plotWidthMm)} m by {metres(scene.site.plotLengthMm)} m.
                        </p>
                    ) : null}
                    {exportNote ? <p role='status'>{exportNote}</p> : null}
                    {import.meta.env.DEV ? (
                        <p className='scene-debug'>
                            Debug: plan {scene.projectId} revision {scene.projectRevision}. Scene schema {scene.schemaVersion}. Backend {backend}.
                            Walls {scene.walls.map((wall) => wall.id).join(', ') || 'none'}.
                            Rooms {scene.floors.map((floor) => floor.roomId).join(', ') || 'none'}.
                            {bounds ? ` Model ${bounds.width} by ${bounds.depth} world units.` : ''}
                        </p>
                    ) : null}
                </>
            )}
        </section>
    );
}

export default SceneViewer;
