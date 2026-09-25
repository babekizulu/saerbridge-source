import { useId, useState } from 'react';
import { FiInfo } from 'react-icons/fi';

type InfoTipProps = {
    label: string;
    children: string;
};

function InfoTip({ label, children }: InfoTipProps) {
    const [open, setOpen] = useState(false);
    const tipId = useId();

    return (
        <span className='info-tip'>
            <button
                type='button'
                className='info-tip-btn'
                aria-expanded={open}
                aria-controls={tipId}
                aria-label={label}
                onClick={() => setOpen((current) => !current)}
            >
                <FiInfo aria-hidden='true' />
            </button>
            {open ? (
                <span id={tipId} className='info-tip-panel' role='note'>
                    {children}
                </span>
            ) : null}
        </span>
    );
}

export default InfoTip;
