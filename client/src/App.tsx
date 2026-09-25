//libs
import {Outlet} from 'react-router';
//components
import Footer from './components/Footer';
import Header from './components/Header';
import Sidebar from './components/Sidebar';

function App() {
    return (
        <div className='app'>
            <a className='skip-link' href='#main'>Skip to content</a>
            <Header />
            <Sidebar />
            <main id='main' className='page-main' tabIndex={-1}>
                <Outlet />
            </main>
            <Footer />
        </div>
    )
}

export default App;
