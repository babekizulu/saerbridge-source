import { FiBox, FiFileText, FiGrid, FiImage, FiMaximize2, FiX } from 'react-icons/fi';
import { LuDraftingCompass } from 'react-icons/lu';
import type { DesignResult } from '../api/homeDesign';
import type { ProgressStep } from '../progressSteps';
import { lazy, Suspense } from 'react';
import EmailDesign from './EmailDesign';
const SceneViewer = lazy(() => import('../three/SceneViewer'));
import BlueprintPreview from './BlueprintPreview';
import CostPreview from './CostPreview';
import GenerationProgress from './GenerationProgress';
import type { Coordinates } from './LocationField';
import PDFGenerator from './PDFGenerator';
import ResponseBox from './ResponseBox';
import SpaceTally from './SpaceTally';
import SupplierPanel from './SupplierPanel';

type StudioPanel = 'image' | 'blueprint' | 'model' | 'pdf' | 'sheet';

type ResultStudioProps = {
    open: boolean;
    panel: StudioPanel;
    onOpen: (panel: StudioPanel) => void;
    onClose: () => void;
    result: DesignResult | null;
    status: 'idle' | 'generating' | 'ready' | 'error';
    progress: ProgressStep[];
    origin: Coordinates | null;
};

const trays: { id: StudioPanel; label: string; icon: typeof FiImage }[] = [
    { id: 'image', label: 'AI generated image', icon: FiImage },
    { id: 'blueprint', label: 'Blueprint', icon: LuDraftingCompass },
    { id: 'model', label: '3D model', icon: FiBox },
    { id: 'pdf', label: 'PDF', icon: FiFileText },
    { id: 'sheet', label: 'Spreadsheet', icon: FiGrid },
];

function ResultStudio({
    open,
    panel,
    onOpen,
    onClose,
    result,
    status,
    progress,
    origin,
}: ResultStudioProps) {
    const imageStatus =
        status === 'generating'
            ? 'generating'
            : status === 'error'
              ? 'error'
              : status === 'ready'
                ? 'ready'
                : 'idle';

    const showImage = !open || panel === 'image';
    const showBlueprint = Boolean(result?.projectPlan) && open && panel === 'blueprint';
    const showModel = Boolean(result) && open && panel === 'model';
    const showPdf = Boolean(result) && open && panel === 'pdf';
    const showSheet = Boolean(result) && open && panel === 'sheet';
    const designReady = status === 'ready' && Boolean(result);

    return (
        <div className='result-studio' aria-label='Design assets'>
            <header className='studio-bar'>
                <p>
                    {result?.projectPlan?.conceptName || result?.projectPlan?.projectId || 'Design'}
                </p>
                {open ? (
                    <button
                        type='button'
                        className='studio-close'
                        onClick={onClose}
                        aria-label='Close design preview'
                    >
                        <FiX aria-hidden='true' />
                        <span>Close</span>
                    </button>
                ) : status !== 'idle' ? (
                    <button
                        type='button'
                        className='studio-close'
                        onClick={() => onOpen(panel)}
                        aria-label='Expand design bar'
                    >
                        <FiMaximize2 aria-hidden='true' />
                    </button>
                ) : null}
            </header>
            {open && designReady ? (
                <nav className='studio-tray' aria-label='Design assets'>
                    {trays.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                type='button'
                                className={panel === item.id ? 'is-active' : undefined}
                                aria-label={item.label}
                                aria-pressed={panel === item.id}
                                onClick={() => onOpen(item.id)}
                            >
                                <Icon aria-hidden='true' />
                                <span>
                                    {
                                        {
                                            image: 'Image',
                                            blueprint: 'Plan',
                                            model: '3D',
                                            pdf: 'Report',
                                            sheet: 'Costs',
                                        }[item.id]
                                    }
                                </span>
                            </button>
                        );
                    })}
                </nav>
            ) : null}
            <div className='studio-stage'>
                {designReady && !open ? (
                    <button className='tool-btn view-assets' onClick={() => onOpen('image')}>
                        View design, plans & downloads
                    </button>
                ) : null}
                {designReady && result ? (
                    <EmailDesign
                        key={result.emailDelivery.token || result.projectPlan?.projectId}
                        delivery={result.emailDelivery}
                    />
                ) : null}
                {status === 'generating' ? <GenerationProgress steps={progress} /> : null}
                {status === 'generating' && !result ? (
                    <div className='design-skeleton' aria-hidden='true' />
                ) : null}
                {status === 'idle' ? <p>Generated design appears here.</p> : null}
                {status === 'error' && !result ? (
                    <p role='alert'>The design could not be generated.</p>
                ) : null}
                {showImage && (result || status === 'ready' || status === 'error') ? (
                    <ResponseBox
                        image={result?.image || ''}
                        status={imageStatus}
                        caption={
                            result?.projectPlan && result.image
                                ? 'Design visualisation — dimensions are defined by the blueprint.'
                                : undefined
                        }
                    />
                ) : null}
                {showBlueprint && result?.projectPlan ? (
                    <BlueprintPreview
                        svg={result.blueprintSvg}
                        dxf={result.blueprintDxf}
                        plan={result.projectPlan}
                    />
                ) : null}
                {showModel && result?.sceneSpec ? (
                    <Suspense fallback={<p>Loading 3D viewer…</p>}>
                        <SceneViewer scene={result.sceneSpec} />
                    </Suspense>
                ) : null}
                {showModel && result && !result.sceneSpec && status === 'ready' ? (
                    <p>This design has no 3D model.</p>
                ) : null}
                {showPdf && result ? (
                    <div className='studio-file'>
                        <PDFGenerator
                            pdfUrl={result.pdfUrl}
                            unavailable={result.pdfStatus !== 'ok'}
                        />
                    </div>
                ) : null}
                {showSheet && result ? (
                    <div className='studio-file'>
                        <CostPreview
                            cost={result.costAnalysis}
                            savings={result.savings}
                            exportUrl={result.spreadsheetUrl}
                            exportStatus={result.spreadsheetStatus}
                        />
                        {result.spaceTally ? <SpaceTally tally={result.spaceTally} /> : null}
                        <SupplierPanel
                            suppliers={result.suppliers}
                            status={result.supplierStatus}
                            origin={origin}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default ResultStudio;
