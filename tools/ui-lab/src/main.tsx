import '@mandor/env/styles/key-value.css';

import './lab.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { LabApp } from './lab-app.js';
import { applyStoredTheme } from './theme.js';

const rootElement = document.getElementById('root');

if (rootElement === null) {
    throw new Error('the lab root is missing');
}

// Antes del primer pintado, para que no haya un destello del tema equivocado.
applyStoredTheme();

const root = createRoot(rootElement);

root.render(
    <StrictMode>
        <LabApp />
    </StrictMode>,
);
