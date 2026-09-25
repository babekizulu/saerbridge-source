import { useEffect, useRef, useState } from 'react';
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export default function InstallApp() {
    const [prompt, setPrompt] = useState<InstallEvent | null>(null);
    const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches);
    const [offline, setOffline] = useState(!navigator.onLine);
    const [dismissed, setDismissed] = useState(false);
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const ready = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
        const done = () => { setInstalled(true); setPrompt(null); dialog.current?.close(); };
        const connectivity = () => setOffline(!navigator.onLine);
        window.addEventListener('beforeinstallprompt', ready);
        window.addEventListener('appinstalled', done);
        window.addEventListener('online', connectivity); window.addEventListener('offline', connectivity);
        return () => {
            window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', done);
            window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity);
        };
    }, []);
    async function install() {
        if (!prompt) { dialog.current?.showModal(); return; }
        try { await prompt.prompt(); await prompt.userChoice; }
        finally { setPrompt(null); setDismissed(true); dialog.current?.close(); }
    }
    return <>
        {offline ? <p className='offline-notice' role='status'>You’re offline. Reconnect to generate a design or send email.</p> : null}
        {!installed ? <button className='tool-btn install-button' onClick={() => dialog.current?.showModal()}>Install app</button> : null}
        {!installed && prompt && !dismissed ? <aside className='install-banner' aria-label='Install Saerbridge'>
            <div><strong>Keep Source on your home screen</strong><p>Open your planner with one tap.</p></div>
            <button className='tool-btn' onClick={install}>Install</button>
            <button className='tool-btn' onClick={() => setDismissed(true)} aria-label='Dismiss install suggestion'>Later</button>
        </aside> : null}
        <dialog className='install-dialog' ref={dialog} aria-labelledby='install-heading'>
            <h2 id='install-heading'>Install Saerbridge Source</h2>
            <p>Add the planner to your home screen. Generating designs and emailing files need an internet connection.</p>
            {prompt ? <button className='tool-btn' onClick={install}>Install on this device</button> : <p>In Chrome on Android, open the browser menu and choose “Add to Home screen” or “Install app”. In Safari on iPhone or iPad, use Share → Add to Home Screen. If the option is missing, visit the HTTPS site in a supported browser.</p>}
            <form method='dialog'><button className='tool-btn'>Close</button></form>
        </dialog>
    </>;
}
