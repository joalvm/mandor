import { app, session, type BrowserWindow } from 'electron';

import type { Logger } from '../log/create-logger.js';
import { installReactDevTools } from './install-react-devtools.js';
import { watchDevToolsShortcut } from './watch-devtools-shortcut.js';

/**
 * What development gets that production does not ask for: the React DevTools extension when
 * the machine has one, and the keyboard shortcut for the built-in DevTools on every mode.
 * The extension is fire-and-forget — a failure lands in the log and the app carries on —
 * while the watcher answers with its disposer, because it holds a listener on the window.
 *
 * The extension is loaded from a folder on the machine with file access granted, which is a
 * reasonable thing to hand a developer and an unasked-for surface inside a signed build. A
 * packaged app therefore never reads the variable at all. The shortcut stays: opening the
 * inspector is a feature of the product, not a leftover of building it.
 */
export function installDevTools(window: BrowserWindow, logger: Logger): () => void {
    if (!app.isPackaged) {
        void installReactDevTools({
            environment: (name) => process.env[name],
            load: (path) =>
                session.defaultSession.extensions.loadExtension(path, { allowFileAccess: true }),
            log: (message) => {
                logger.log('warn', message);
            },
        });
    }

    return watchDevToolsShortcut(window.webContents);
}
