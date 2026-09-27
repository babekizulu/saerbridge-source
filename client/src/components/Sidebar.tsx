import { useEffect, useState } from 'react';

const sections = [
    { id: 'selection', label: 'Selection' },
    { id: 'materials', label: 'Materials' },
    { id: 'design-result', label: 'Design' },
];

function Sidebar() {
    const [activeId, setActiveId] = useState(() =>
        sections.find(({ id }) => `#${id}` === window.location.hash)?.id || 'selection'
    );
    useEffect(() => {
        // Both columns can be visible on desktop. Follow the chosen anchor,
        // including browser history, instead of activating the empty result panel.
        const syncSection = () => setActiveId(
            sections.find(({ id }) => `#${id}` === window.location.hash)?.id || 'selection'
        );
        window.addEventListener('hashchange', syncSection);
        return () => window.removeEventListener('hashchange', syncSection);
    }, []);

    return (
        <nav className='sidebar' aria-label='Project sections'>
            <ul className='section-links'>
                {sections.map(({ id, label }) => (
                    <li key={id}>
                        <a
                            href={`#${id}`}
                            aria-current={activeId === id ? 'location' : undefined}
                            onClick={() => setActiveId(id)}
                        >
                            {label}
                        </a>
                    </li>
                ))}
            </ul>
            <div className='section-selector'>
                <label htmlFor='project-section'>Project section</label>
                <select
                    id='project-section'
                    value={activeId}
                    onChange={(event) => {
                        setActiveId(event.target.value);
                        window.location.hash = event.target.value;
                    }}
                >
                    {sections.map(({ id, label }) => (
                        <option key={id} value={id}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>
        </nav>
    );
}
export default Sidebar;
