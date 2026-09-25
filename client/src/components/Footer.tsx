function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className='site-footer'>
            <p>© {year} Saerbridge (Pty) Ltd. All rights reserved. Home planning guidance, not an engineering certificate.</p>
        </footer>
    );
}

export default Footer;
