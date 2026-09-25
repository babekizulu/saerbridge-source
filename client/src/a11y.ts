export type TextSize = 'default' | 'large' | 'larger';
export type Contrast = 'default' | 'high';
export type Motion = 'system' | 'reduce';

export type A11yPrefs = {
    textSize: TextSize;
    contrast: Contrast;
    motion: Motion;
};

const STORAGE_KEY = 'saerbridge-a11y';

export const defaultPrefs: A11yPrefs = {
    textSize: 'default',
    contrast: 'default',
    motion: 'system',
};

export function loadPrefs(): A11yPrefs {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultPrefs;
        const parsed = JSON.parse(raw) as Partial<A11yPrefs>;
        return {
            textSize: parsed.textSize === 'large' || parsed.textSize === 'larger'
                ? parsed.textSize
                : 'default',
            contrast: parsed.contrast === 'high' ? 'high' : 'default',
            motion: parsed.motion === 'reduce' ? 'reduce' : 'system',
        };
    } catch {
        return defaultPrefs;
    }
}

export function applyPrefs(prefs: A11yPrefs) {
    const root = document.documentElement;
    root.dataset.text = prefs.textSize;
    root.dataset.contrast = prefs.contrast;
    if (prefs.motion === 'reduce') root.dataset.motion = 'reduce';
    else delete root.dataset.motion;
}

export function savePrefs(prefs: A11yPrefs) {
    applyPrefs(prefs);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
        return;
    }
}
