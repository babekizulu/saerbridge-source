import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router';
import { FiFileText, FiGrid, FiHelpCircle, FiHome, FiImage, FiMousePointer } from 'react-icons/fi';
import HowToUseDialog from './HowToUseDialog';
import TermsOfServiceDialog from './TermsOfServiceDialog';

const sections = [
    { id: 'selection', label: 'Selection', icon: FiMousePointer },
    { id: 'materials', label: 'Materials', icon: FiGrid },
    { id: 'design-result', label: 'Design', icon: FiImage },
];

function Sidebar() {
    const [activeId, setActiveId] = useState('planner-intro');
    const [helpOpen, setHelpOpen] = useState(false);
    const [termsOpen, setTermsOpen] = useState(false);
    const helpButton = useRef<HTMLButtonElement>(null);
    const termsButton = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const nodes = ['planner-intro', ...sections.map((section) => section.id)]
            .map((id) => document.getElementById(id))
            .filter((node): node is HTMLElement => Boolean(node));
        if (nodes.length === 0) return undefined;
        const observer = new IntersectionObserver((entries) => {
            const visible = entries
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible?.target.id) setActiveId(visible.target.id);
        }, { rootMargin: '-15% 0px -60% 0px', threshold: [0.15, 0.4, 0.75] });
        nodes.forEach((node) => observer.observe(node));
        return () => observer.disconnect();
    }, []);

    return (
        <aside className='sidebar'>
            <nav aria-label='Primary'>
                <ul>
                    <li>
                        <NavLink
                            to='/'
                            end
                            className={activeId === 'planner-intro' ? 'is-active' : undefined}
                            onClick={() => setActiveId('planner-intro')}
                        >
                            <FiHome aria-hidden='true' />
                            Planner
                        </NavLink>
                    </li>
                    <li>
                        <button
                            ref={helpButton}
                            type='button'
                            className={helpOpen ? 'is-active' : undefined}
                            aria-haspopup='dialog'
                            aria-controls='howto-dialog'
                            aria-expanded={helpOpen}
                            onClick={() => setHelpOpen(true)}
                        >
                            <FiHelpCircle aria-hidden='true' />
                            Guide
                        </button>
                    </li>
                    <li>
                        <button
                            ref={termsButton}
                            type='button'
                            className={termsOpen ? 'is-active' : undefined}
                            aria-haspopup='dialog'
                            aria-controls='terms-dialog'
                            aria-expanded={termsOpen}
                            onClick={() => setTermsOpen(true)}
                        >
                            <FiFileText aria-hidden='true' />
                            Terms
                        </button>
                    </li>
                    {sections.map((section) => {
                        const Icon = section.icon;
                        return (
                            <li key={section.id}>
                                <a
                                    href={`#${section.id}`}
                                    className={activeId === section.id ? 'is-active' : undefined}
                                    aria-current={activeId === section.id ? 'true' : undefined}
                                    onClick={() => setActiveId(section.id)}
                                >
                                    <Icon aria-hidden='true' />
                                    {section.label}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </nav>
            <HowToUseDialog
                open={helpOpen}
                onClose={() => setHelpOpen(false)}
                returnFocusRef={helpButton}
            />
            <TermsOfServiceDialog
                open={termsOpen}
                onClose={() => setTermsOpen(false)}
                returnFocusRef={termsButton}
            />
        </aside>
    );
}

export default Sidebar;
