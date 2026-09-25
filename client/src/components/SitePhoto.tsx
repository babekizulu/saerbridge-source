import { useEffect, useId, useRef } from 'react';
import { FiImage } from 'react-icons/fi';
import { resizePhoto } from '../photoFile';
import InfoTip from './InfoTip';

export type SitePhotoValue = {
    id: string;
    name: string;
    previewUrl: string;
    upload: File;
    consent: boolean;
};

type SitePhotoProps = {
    value: SitePhotoValue | null;
    onChange: (next: SitePhotoValue | null) => void;
};

function SitePhoto({ value, onChange }: SitePhotoProps) {
    const chooseRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);
    const chooseButtonRef = useRef<HTMLButtonElement>(null);
    const focusChoose = useRef(false);
    const consentId = useId();
    const helpId = useId();
    const errorId = useId();
    const errorRef = useRef<HTMLParagraphElement>(null);

    const showError = (message: string) => {
        if (errorRef.current) errorRef.current.textContent = message;
    };

    useEffect(() => {
        if (!value && focusChoose.current) {
            focusChoose.current = false;
            chooseButtonRef.current?.focus();
        }
    }, [value]);

    const takeFile = async (file: File | undefined) => {
        if (!file) return;
        try {
            const upload = await resizePhoto(file);
            const previewUrl = URL.createObjectURL(file);
            onChange({
                id: `${file.name}:${file.size}:${file.lastModified}:${crypto.randomUUID()}`,
                name: file.name,
                previewUrl,
                upload,
                consent: false,
            });
            showError('');
        } catch (error) {
            showError(error instanceof Error ? error.message : 'The photograph could not be prepared.');
        }
    };

    return (
        <section className='site-photo' aria-labelledby='site-photo-heading'>
            <div className='planner-card-heading'>
                <h2 id='site-photo-heading'>Current home</h2>
                <InfoTip label='About the home photograph'>
                    Upload a photograph only if you have permission to use it. It is not sent until you tick the permission box. Photograph the building rather than people, and do not upload identity documents.
                </InfoTip>
            </div>
            {value ? (
                <div className='site-photo-frame has-photo'>
                    <img src={value.previewUrl} alt='Photograph of the current home' />
                    <p className='site-photo-name'>{value.name}</p>
                    <div className='site-photo-actions'>
                        <button type='button' className='tool-btn' onClick={() => chooseRef.current?.click()}>
                            Replace
                        </button>
                        <button type='button' className='tool-btn' onClick={() => cameraRef.current?.click()}>
                            Take photo
                        </button>
                        <button
                            type='button'
                            className='tool-btn'
                            onClick={() => {
                                focusChoose.current = true;
                                onChange(null);
                                showError('');
                            }}
                        >
                            Remove
                        </button>
                    </div>
                </div>
            ) : (
                <div className='site-photo-frame'>
                    <FiImage aria-hidden='true' />
                    <p>Add a photo of your current home</p>
                    <p className='site-photo-secondary'>Optional — use a photo to explore a renovation concept.</p>
                    <div className='site-photo-actions'>
                        <button ref={chooseButtonRef} type='button' className='tool-btn' onClick={() => chooseRef.current?.click()}>
                            Choose photo
                        </button>
                        <button type='button' className='tool-btn' onClick={() => cameraRef.current?.click()}>
                            Take photo
                        </button>
                    </div>
                </div>
            )}
            <input
                ref={chooseRef}
                className='visually-hidden'
                type='file'
                accept='image/jpeg,image/png,image/webp'
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    void takeFile(file);
                }}
            />
            <input
                ref={cameraRef}
                className='visually-hidden'
                type='file'
                accept='image/jpeg,image/png,image/webp'
                capture='environment'
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    void takeFile(file);
                }}
            />
            {value ? (
                <div className='site-photo-consent'>
                    <label htmlFor={consentId}>
                        <input
                            id={consentId}
                            type='checkbox'
                            checked={value.consent}
                            aria-describedby={helpId}
                            onChange={(event) => onChange({ ...value, consent: event.target.checked })}
                        />
                        I have permission to upload this image and understand that it will be sent securely for AI processing to generate a renovation concept.
                    </label>
                    <p id={helpId}>
                        The photograph is used to generate the design you request. It may be sent to the configured AI provider.
                        Avoid uploading identity documents or other sensitive papers. Source does not need a photograph of people;
                        photograph the building instead.
                    </p>
                    {value.consent ? null : (
                        <p className='site-photo-warning' role='status'>
                            This photograph will not be sent until permission is given.
                        </p>
                    )}
                </div>
            ) : null}
            <p id={errorId} ref={errorRef} className='site-photo-error' role='alert' />
        </section>
    );
}

export default SitePhoto;
