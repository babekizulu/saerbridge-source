import { useEffect, useId, useRef, type RefObject } from 'react';

type TermsOfServiceDialogProps = {
    open: boolean;
    onClose: () => void;
    returnFocusRef: RefObject<HTMLButtonElement | null>;
};

function TermsOfServiceDialog({ open, onClose, returnFocusRef }: TermsOfServiceDialogProps) {
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
            id='terms-dialog'
            className='modal-dialog'
            aria-labelledby={titleId}
            onClose={finishClose}
            onClick={(event) => {
                if (event.target === event.currentTarget) event.currentTarget.close();
            }}
        >
            <div className='modal-panel howto-panel' onClick={(event) => event.stopPropagation()}>
                <div className='modal-heading'>
                    <h2 id={titleId} ref={headingRef} tabIndex={-1}>Terms of service</h2>
                    <button type='button' className='modal-close' onClick={() => dialogRef.current?.close()}>
                        Close
                    </button>
                </div>
                <h3>Liability</h3>
                <p>
                    Source is a planning aid. A generated image, guidance note, cost estimate, supplier
                    listing, or map pin is a concept, not a construction document, survey, quotation,
                    or approval.
                </p>
                <p>
                    To the extent the law allows, Saerbridge and anyone who provides Source is not
                    liable for loss, damage, injury, cost overruns, or delays that come from using or
                    relying on a generated design, price, supplier, map location, or photograph. You
                    are responsible for checking measurements, prices, material suitability, and local
                    building requirements with qualified people before you build, buy, or alter a dwelling.
                </p>
                <p>
                    You may upload a photograph only when you have permission to use it. Do not upload
                    identity documents. A photograph of the building is enough. Source does not identify
                    people in photographs.
                </p>
                <p>
                    Prices are indicative planning information, not supplier quotations. Availability,
                    delivery, and store prices can change. Local building requirements must be checked
                    before construction.
                </p>
            </div>
        </dialog>
    );
}

export default TermsOfServiceDialog;
