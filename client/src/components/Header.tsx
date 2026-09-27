import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { FiMenu, FiX, FiHome, FiHelpCircle, FiFileText } from 'react-icons/fi';
import AccessibilityBar from './AccessibilityBar';
import Logo from './Logo';
import InstallApp from './InstallApp';
import HowToUseDialog from './HowToUseDialog';
import TermsOfServiceDialog from './TermsOfServiceDialog';

function Header() {
    const menu = useRef<HTMLDialogElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const helpButton = useRef<HTMLButtonElement>(null);
    const termsButton = useRef<HTMLButtonElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [termsOpen, setTermsOpen] = useState(false);

    return (
        <>
            <header className='header'>
                <Logo />
                <button
                    className='tool-btn menu-trigger'
                    ref={trigger}
                    aria-haspopup='dialog'
                    aria-controls='site-menu'
                    aria-expanded={menuOpen}
                    onClick={() => {
                        menu.current?.showModal();
                        setMenuOpen(true);
                    }}
                >
                    <FiMenu aria-hidden='true' /> Menu
                </button>
            </header>
            <dialog
                id='site-menu'
                className='menu-dialog'
                ref={menu}
                aria-labelledby='menu-heading'
                onClose={() => {
                    setMenuOpen(false);
                    trigger.current?.focus();
                }}
                onClick={(event) => {
                    if (event.target === event.currentTarget) menu.current?.close();
                }}
            >
                <div className='menu-panel'>
                    <div className='modal-heading'>
                        <h2 id='menu-heading'>Menu</h2>
                        <button className='tool-btn' onClick={() => menu.current?.close()}>
                            <FiX aria-hidden='true' /> Close
                        </button>
                    </div>
                    <nav className='menu-navigation' aria-label='Main navigation'>
                        <h3>Navigation</h3>
                        <Link to='/' onClick={() => menu.current?.close()}>
                            <FiHome aria-hidden='true' /> Planner
                        </Link>
                        <button
                            ref={helpButton}
                            aria-haspopup='dialog'
                            aria-controls='howto-dialog'
                            aria-expanded={helpOpen}
                            onClick={() => setHelpOpen(true)}
                        >
                            <FiHelpCircle aria-hidden='true' /> Guide
                        </button>
                        <button
                            ref={termsButton}
                            aria-haspopup='dialog'
                            aria-controls='terms-dialog'
                            aria-expanded={termsOpen}
                            onClick={() => setTermsOpen(true)}
                        >
                            <FiFileText aria-hidden='true' /> Terms
                        </button>
                    </nav>
                    <section className='menu-settings' aria-labelledby='display-heading'>
                        <h3 id='display-heading'>Accessibility &amp; display</h3>
                        <AccessibilityBar />
                    </section>
                    <InstallApp />
                </div>
            </dialog>
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
        </>
    );
}
export default Header;
