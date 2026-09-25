type ResponseBoxProps = {
    image: string;
    status: 'idle' | 'generating' | 'ready' | 'error';
    caption?: string;
};

function ResponseBox({ image, status, caption }: ResponseBoxProps) {
    if (status === 'idle' && !image) return null;

    return (
        <div className='response-box'>
            {status === 'generating' ? <p>Generating your home design…</p> : null}
            {status === 'error' ? <p role='alert'>The design could not be generated.</p> : null}
            {status === 'generating' ? (
                <div className='design-skeleton' aria-hidden='true'>
                    <span />
                </div>
            ) : null}
            {status === 'ready' && image ? (
                <figure>
                    <img src={image} alt='Design visualisation of the approved plan' />
                    {caption ? <figcaption>{caption}</figcaption> : null}
                </figure>
            ) : null}
            {status === 'ready' && !image ? (
                <p role='status'>The design visualisation could not be generated. The blueprint still has the dimensions.</p>
            ) : null}
        </div>
    );
}

export default ResponseBox;
