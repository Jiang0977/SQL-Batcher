import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../components/App';
import { ConfirmProvider } from '../components/ConfirmProvider';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ConfirmProvider>
        <App />
    </ConfirmProvider>
);