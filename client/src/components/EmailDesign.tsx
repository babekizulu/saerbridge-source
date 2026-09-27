import { useId, useState } from 'react';
import { apiOrigin, type EmailDelivery } from '../api/homeDesign';

export default function EmailDesign({ delivery }: { delivery: EmailDelivery }) {
    const id = useId();
    const [email, setEmail] = useState('');
    const [consent, setConsent] = useState(false);
    const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [note, setNote] = useState('');
    return <details className='email-design'>
        <summary>Email my design</summary>
        {!delivery.available ? <p>Email delivery is not enabled yet. Choose Report or Costs above to download your files.</p> :
        <form onSubmit={async (event) => {
            event.preventDefault();
            if (state !== 'idle') return;
            setState('sending'); setNote('');
            try {
                const response = await fetch(`${apiOrigin}/api/email-design`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: delivery.token, email: email.trim(), consent }),
                    signal: AbortSignal.timeout(25000),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Email could not be sent.');
                setState('sent'); setNote('Email accepted for delivery. Check your inbox and spam folder.');
            } catch (error) {
                setState('idle'); setNote(error instanceof Error ? error.message : 'Email could not be sent.');
            }
        }}>
            <p>Send these files to your inbox: {delivery.files?.join(', ')}. Available for 30 minutes while this server stays online.</p>
            <label htmlFor={id}>Your email address</label>
            <input id={id} type='email' autoComplete='email' inputMode='email' required maxLength={254} value={email} disabled={state !== 'idle'} onChange={(event) => setEmail(event.target.value)} />
            <label className='email-consent'><input type='checkbox' required checked={consent} disabled={state !== 'idle'} onChange={(event) => setConsent(event.target.checked)} />I confirm this is my address and agree to send my design files through Resend. No marketing emails.</label>
            <button className='tool-btn' type='submit' disabled={!consent || state !== 'idle'}>{state === 'sent' ? 'Submitted' : state === 'sending' ? 'Sending…' : 'Send my files'}</button>
            <p role='status'>{note}</p>
        </form>}
    </details>;
}
