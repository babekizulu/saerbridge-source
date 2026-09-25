import { FiUpload } from 'react-icons/fi';

type SendBtnProps = {
    onClick: () => void;
    disabled?: boolean;
};

function SendBtn({ onClick, disabled = false }: SendBtnProps) {
    return (
        <button
            type='button'
            className='upload-btn'
            onClick={onClick}
            disabled={disabled}
            aria-label={disabled ? 'Generating your home design' : 'Generate design'}
        >
            <FiUpload aria-hidden='true' />
            <span>{disabled ? 'Generating…' : 'Generate design'}</span>
        </button>
    );
}

export default SendBtn;
