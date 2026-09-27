//libs
import {Link} from 'react-router';
//assets
import logo from '../assets/source_60x60.svg';

function Logo() {
    return (
        <Link to='/' className='logo' aria-label='Saerbridge Source'>
            <img src={logo} alt=''/>
            <span className='logo-blue'>saerbridge</span>
            {' '}
            <span className='logo-grey'>source.</span>
        </Link>
    );
}

export default Logo;
