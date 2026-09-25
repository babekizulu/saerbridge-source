import { useState } from 'react';
import { FiPause, FiType } from 'react-icons/fi';
import { LuContrast } from 'react-icons/lu';
import { loadPrefs, savePrefs, type A11yPrefs, type TextSize } from '../a11y';

const textSizes: { id: TextSize; label: string; className: string }[] = [
    { id: 'default', label: 'Default text size', className: 'is-text-default' },
    { id: 'large', label: 'Large text size', className: 'is-text-large' },
    { id: 'larger', label: 'Larger text size', className: 'is-text-larger' },
];

function AccessibilityBar() {
    const [prefs, setPrefs] = useState<A11yPrefs>(() => loadPrefs());

    const update = (next: A11yPrefs) => {
        setPrefs(next);
        savePrefs(next);
    };

    return (
        <div className='a11y-bar' aria-label='Accessibility settings'>
            <div className='a11y-group' role='group' aria-label='Text size'>
                {textSizes.map((size) => (
                    <button
                        key={size.id}
                        type='button'
                        className={`a11y-btn ${size.className}`}
                        aria-label={size.label}
                        aria-pressed={prefs.textSize === size.id}
                        onClick={() => update({ ...prefs, textSize: size.id })}
                    >
                        <FiType aria-hidden='true' />
                    </button>
                ))}
            </div>
            <button
                type='button'
                className='a11y-btn'
                aria-label='High contrast'
                aria-pressed={prefs.contrast === 'high'}
                onClick={() => update({
                    ...prefs,
                    contrast: prefs.contrast === 'high' ? 'default' : 'high',
                })}
            >
                <LuContrast aria-hidden='true' />
            </button>
            <button
                type='button'
                className='a11y-btn'
                aria-label='Reduce motion'
                aria-pressed={prefs.motion === 'reduce'}
                onClick={() => update({
                    ...prefs,
                    motion: prefs.motion === 'reduce' ? 'system' : 'reduce',
                })}
            >
                <FiPause aria-hidden='true' />
            </button>
        </div>
    );
}

export default AccessibilityBar;
