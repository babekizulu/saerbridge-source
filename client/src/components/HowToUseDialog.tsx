import { useEffect, useId, useRef, type RefObject } from 'react';
import { FiEdit3, FiGrid, FiImage, FiMousePointer, FiSidebar, FiUpload } from 'react-icons/fi';

type HowToUseDialogProps = {
    open: boolean;
    onClose: () => void;
    returnFocusRef: RefObject<HTMLButtonElement | null>;
};

const steps = [
    {
        icon: FiMousePointer,
        title: 'Add items',
        body: 'Drag a material or furniture tile into the design box, or tap it. On phones, tap to add without interrupting scrolling. You can also focus a tile and press Enter or Space. The same item can be added more than once.',
    },
    {
        icon: FiGrid,
        title: 'Arrange rows',
        body: 'Drop a tile underneath one that is already in the box to open a new row. For a click or keyboard add, turn on Add on a new row first. The first item always starts the top row.',
    },
    {
        icon: FiImage,
        title: 'Photograph, with permission',
        body: 'A photo is optional. Tick the permission box before it is sent. Photograph the building, not people or identity documents. The photo is not included until you grant permission.',
    },
    {
        icon: FiEdit3,
        title: 'Add optional details',
        body: 'Plot width, plot length, desired dwelling area, a short site note, an area, and a residence type are optional. Plot size is not the house size. Enter the dwelling area separately. They are included only when you generate.',
    },
    {
        icon: FiUpload,
        title: 'Generate design',
        body: 'The button appears when the box has an item, or a photograph has permission. While a design is generating, the button is disabled and the page says “Generating your home design…”. Changing the plan discards that result.',
    },
    {
        icon: FiSidebar,
        title: 'Read the result',
        body: 'A new home shows the blueprint, a 3D model, and an image of the same plan. Room sizes, quantities, and costs come from that plan. A renovation photograph keeps the existing image workflow and does not draw a blueprint. Download the PDF, SVG, DXF, CSV, and GLB when they are ready.',
    },
];

function HowToUseDialog({ open, onClose, returnFocusRef }: HowToUseDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return undefined;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
        return undefined;
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const frame = window.requestAnimationFrame(() => headingRef.current?.focus());
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
            window.cancelAnimationFrame(frame);
        };
    }, [open]);

    const finishClose = () => {
        onClose();
        returnFocusRef.current?.focus();
    };

    return (
        <dialog
            ref={dialogRef}
            id='howto-dialog'
            className='modal-dialog'
            aria-labelledby={titleId}
            onClose={finishClose}
            onClick={(event) => {
                if (event.target === event.currentTarget) event.currentTarget.close();
            }}
        >
            <div className='modal-panel howto-panel' onClick={(event) => event.stopPropagation()}>
                <div className='modal-heading'>
                    <h2 id={titleId} ref={headingRef} tabIndex={-1}>How to use the design box</h2>
                    <button type='button' className='modal-close' onClick={() => dialogRef.current?.close()}>
                        Close
                    </button>
                </div>
                <p className='howto-lead'>
                    Build a concept from materials and furniture, or start from a photograph you have
                    permission to use. Nothing is sent until you choose Generate design.
                </p>
                <ol className='howto-steps'>
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <li key={step.title} className='howto-step'>
                                <span className='howto-step-mark' aria-hidden='true'>
                                    <Icon />
                                    <span>{index + 1}</span>
                                </span>
                                <div>
                                    <h3>{step.title}</h3>
                                    <p>{step.body}</p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
                <h3>Clear and accessibility</h3>
                <p>
                    Remove a tile with its × button. Clearing the box does not call the server.
                    If a permitted photograph is still attached, a renovation concept can still be generated.
                    Skip to content is the first control from the top of the page. The icon buttons in the
                    header set text size, high contrast, and reduced motion, and those choices stay in this
                    browser. Press Escape to close this dialog.
                </p>
                <h3>What you receive</h3>
                <p>
                    The image is a concept rendering, not a construction drawing. The space tally is a
                    planning count, not a measured floor plan. The PDF is written guidance. Costs are
                    planning estimates. The result is a design aid, not a survey or a permit set.
                </p>
            </div>
        </dialog>
    );
}

export default HowToUseDialog;
