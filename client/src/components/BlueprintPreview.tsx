import { useState } from 'react';
import type { ProjectPlanSummary } from '../api/homeDesign';

type BlueprintPreviewProps = {
    svg: string;
    dxf: string;
    plan: ProjectPlanSummary;
};

function metres(mm: number) {
    return (Math.round((mm / 1000) * 100) / 100).toString();
}

function squareMetres(mm2: number) {
    return (Math.round((mm2 / 1000000) * 100) / 100).toString();
}

function downloadHref(text: string, mime: string) {
    return `data:${mime};charset=utf-8,${encodeURIComponent(text)}`;
}

function BlueprintPreview({ svg, dxf, plan }: BlueprintPreviewProps) {
    const [scale, setScale] = useState(1);
    const [showDimensions, setShowDimensions] = useState(true);
    const footprint = plan.footprint;
    const windows = plan.openings.filter((opening) => opening.kind === 'window');
    const doors = plan.openings.filter((opening) => opening.kind === 'door');

    return (
        <section className='blueprint-preview' aria-labelledby='blueprint-heading'>
            <h3 id='blueprint-heading'>Blueprint</h3>
            <p>
                Project {plan.conceptName || plan.projectId}, revision {plan.revision}. This drawing is the source of dimensions.
            </p>
            <div className='blueprint-tools' role='toolbar' aria-label='Blueprint view'>
                <button type='button' onClick={() => setScale((value) => Math.min(2.5, Math.round((value + 0.25) * 100) / 100))}>Zoom in</button>
                <button type='button' onClick={() => setScale((value) => Math.max(0.5, Math.round((value - 0.25) * 100) / 100))}>Zoom out</button>
                <button type='button' onClick={() => setScale(1)}>Fit</button>
                <button type='button' aria-pressed={showDimensions} onClick={() => setShowDimensions((value) => !value)}>
                    {showDimensions ? 'Hide dimensions' : 'Show dimensions'}
                </button>
            </div>
            <div className='blueprint-frame' tabIndex={0} aria-label='Floor plan drawing. Room measurements are in the table below.'>
                <div className='blueprint-stage' style={{ width: `${scale * 100}%` }} dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
            {footprint ? (
                <p>
                    Plot {squareMetres(plan.site.plotAreaMm2)} m².
                    {' '}Dwelling footprint {metres(footprint.widthMm)} m by {metres(footprint.lengthMm)} m, {squareMetres(footprint.areaMm2)} m².
                    {' '}Storeys: {plan.site.storeys}.
                </p>
            ) : (
                <p>No dwelling footprint was generated. Plot size is not used as the building area.</p>
            )}
            <h4>Rooms</h4>
            <ul className='plan-cards'>
                {plan.rooms.map((room) => (
                    <li key={room.id}>
                        <strong>{room.name}</strong>
                        <span>{showDimensions ? `${metres(room.widthMm)} m by ${metres(room.lengthMm)} m` : 'Dimensions hidden'}</span>
                        <span>{showDimensions ? `${squareMetres(room.areaMm2)} m²` : ''}</span>
                    </li>
                ))}
            </ul>
            <h4>Openings</h4>
            <p>{windows.length} windows and {doors.length} doors.</p>
            <ul className='plan-cards'>
                {plan.openings.map((opening) => (
                    <li key={opening.id}>
                        <strong>{opening.kind === 'window' ? 'Window' : 'Door'}</strong>
                        <span>{opening.widthMm} by {opening.heightMm} mm</span>
                        <span>Wall {opening.wallId}</span>
                    </li>
                ))}
            </ul>
            <h4>Quantities</h4>
            {plan.quantityTakeoff.length === 0 ? <p>No quantities were calculated.</p> : (
                <ul className='quantity-list'>
                    {plan.quantityTakeoff.map((item) => (
                        <li key={item.itemId}>
                            <details>
                                <summary>
                                    {item.description}: {item.purchaseQuantity ?? item.requiredQuantity ?? 'unknown'} {item.requiredUnit}. {item.priceStatus.replaceAll('_', ' ')}. {item.quantityStatus.replaceAll('_', ' ')}.
                                </summary>
                                <p>{item.equationDescription}</p>
                                <p>{item.specification}</p>
                            </details>
                        </li>
                    ))}
                </ul>
            )}
            <h4>Assumptions</h4>
            <ul>
                {plan.assumptions.map((item) => <li key={item}>{item}</li>)}
                <li>Affordability: {plan.affordability.status.replaceAll('_', ' ')}. {plan.affordability.reason}</li>
                {plan.professionalReview.map((item) => <li key={item}>{item}: professional review required.</li>)}
            </ul>
            <div className='blueprint-files'>
                {svg ? <a className='pdf-generator' href={downloadHref(svg, 'image/svg+xml')} download={`${plan.projectId}-blueprint.svg`}>Download SVG</a> : null}
                {dxf ? <a className='pdf-generator' href={downloadHref(dxf, 'application/dxf')} download={`${plan.projectId}-blueprint.dxf`}>Download DXF</a> : null}
            </div>
        </section>
    );
}

export default BlueprintPreview;
