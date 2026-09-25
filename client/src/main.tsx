//libs
import {createRoot} from 'react-dom/client'
import {createBrowserRouter} from 'react-router';
import {RouterProvider} from 'react-router';
//components
import App from './App';
//pages
import ProjectPlanner from './components/pages/ProjectPlanner';
import {applyPrefs, loadPrefs} from './a11y';
//styles
import './scss/main.scss';
//dom elements
const container = document.querySelector('#root');
if (!container) {
    throw new Error('Root element #root was not found');
}
applyPrefs(loadPrefs());
const root = createRoot(container);
//router
const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        children: [
            {
                index: true,
                element: <ProjectPlanner />,
            },
        ],
    },
]);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => { /* Online app remains usable if installation is unavailable. */ });
    });
}
//render
root.render(<RouterProvider router={router} />);
