//components
import AccessibilityBar from './AccessibilityBar';
import Logo from './Logo';
import InstallApp from './InstallApp';

function Header() {
    return (
        <header className='header'>
            <Logo />
            <div className='header-actions'><InstallApp /><AccessibilityBar /></div>
        </header>
    )
};

export default Header;
