import type { GraphicsQuality } from '../utils/performance';
import type { CameraView } from './CameraControls';

type SceneToolbarProps = {
    view: CameraView;
    quality: GraphicsQuality;
    showRoof: boolean;
    showFurniture: boolean;
    showDimensions: boolean;
    onView: (view: CameraView) => void;
    onQuality: (quality: GraphicsQuality) => void;
    onRoof: () => void;
    onFurniture: () => void;
    onDimensions: () => void;
    onReset: () => void;
    onExport: () => void;
};

const views: { id: CameraView; label: string }[] = [
    { id: 'perspective', label: 'Perspective' },
    { id: 'top', label: 'Top' },
    { id: 'front', label: 'Front' },
    { id: 'rear', label: 'Rear' },
    { id: 'left', label: 'Left' },
    { id: 'right', label: 'Right' },
];

function SceneToolbar(props: SceneToolbarProps) {
    return (
        <div className='blueprint-tools' role='toolbar' aria-label='3D view'>
            {views.map((item) => (
                <button key={item.id} type='button' aria-pressed={props.view === item.id} onClick={() => props.onView(item.id)}>
                    {item.label}
                </button>
            ))}
            <button type='button' onClick={props.onReset}>Reset camera</button>
            <button type='button' aria-pressed={props.showRoof} onClick={props.onRoof}>{props.showRoof ? 'Hide roof' : 'Show roof'}</button>
            <button type='button' aria-pressed={props.showFurniture} onClick={props.onFurniture}>{props.showFurniture ? 'Hide furniture' : 'Show furniture'}</button>
            <button type='button' aria-pressed={props.showDimensions} onClick={props.onDimensions}>{props.showDimensions ? 'Hide dimensions' : 'Show dimensions'}</button>
            {(['LOW', 'BALANCED', 'HIGH'] as GraphicsQuality[]).map((level) => (
                <button key={level} type='button' aria-pressed={props.quality === level} onClick={() => props.onQuality(level)}>
                    {level === 'LOW' ? 'Low' : level === 'HIGH' ? 'High' : 'Balanced'}
                </button>
            ))}
            <button type='button' onClick={props.onExport}>Download GLB</button>
        </div>
    );
}

export default SceneToolbar;
