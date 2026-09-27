import { useState } from 'react';
import { FiPause, FiType, FiSun } from 'react-icons/fi';
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
            <p>Text size</p>
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
                        <span>{size.label.replace(' text size', '')}</span>
                    </button>
                ))}
            </div>
            <button
                type='button'
                className='a11y-btn'
                aria-label='High contrast'
                aria-pressed={prefs.contrast === 'high'}
                onClick={() =>
                    update({
                        ...prefs,
                        contrast: prefs.contrast === 'high' ? 'default' : 'high',
                    })
                }
            >
                <FiSun aria-hidden='true' />
                <span>High contrast</span>
            </button>
            <button
                type='button'
                className='a11y-btn'
                aria-label='Reduce motion'
                aria-pressed={prefs.motion === 'reduce'}
                onClick={() =>
                    update({
                        ...prefs,
                        motion: prefs.motion === 'reduce' ? 'system' : 'reduce',
                    })
                }
            >
                <FiPause aria-hidden='true' />
                <span>Reduce motion</span>
            </button>
        </div>
    );
}

export default AccessibilityBar;
