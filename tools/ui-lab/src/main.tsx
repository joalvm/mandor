import './lab-bridge.js';
import '@mandor/env/styles/key-value.css';

import './lab.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { LabApp } from './lab-app.js';
import { applyStoredAppearance } from './theme.js';

const rootElement = document.getElementById('root');

if (rootElement === null) {
    throw new Error('the lab root is missing');
}

// Antes del primer pintado, para que no haya un destello de la apariencia equivocada.
applyStoredAppearance();

const root = createRoot(rootElement);

root.render(
    <StrictMode>
        <LabApp />
    </StrictMode>,
);
