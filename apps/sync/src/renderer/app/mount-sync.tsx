import '@mandor/ui/styles.css';
import '@mandor/docs/prose.css';
import '@mandor/shell/grid.css';
import '@mandor/env/styles/key-value.css';

import { PreferencesApplication, PreferencesProvider } from '@mandor/prefs';
import {
    FaultBoundary,
    registerShellCommands,
    rootErrorOptions,
    saveOnClose,
    watchRendererFaults,
} from '@mandor/shell';
import { signCreatedStyles, warmEditorWhenIdle } from '@mandor/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { registerLooseRequests } from '../features/requests/index.js';
import { SyncApp } from './SyncApp.js';

const rootElement = document.getElementById('root');

if (rootElement === null) {
    throw new Error('renderer root is missing');
}

// Before anything draws: the first sheet written at runtime can be the scroll lock of a menu.
signCreatedStyles();

// Before anything can fail: what React and the window leave uncaught ends in the log.
const stopFaults = watchRendererFaults(window);

const stopLoose = registerLooseRequests();
const stopCommands = registerShellCommands();
const stopSaving = saveOnClose();
const root = createRoot(rootElement, rootErrorOptions());

root.render(
    <StrictMode>
        <PreferencesProvider>
            <PreferencesApplication>
                <FaultBoundary scope="window">
                    <SyncApp />
                </FaultBoundary>
            </PreferencesApplication>
        </PreferencesProvider>
    </StrictMode>,
);

// Docs are written in the editor: the first one opened does not wait for it to load.
warmEditorWhenIdle();

if (import.meta.hot !== undefined) {
    import.meta.hot.dispose(() => {
        stopFaults();
        stopSaving();
        stopCommands();
        stopLoose();
        root.unmount();
    });
}
