import { app, BrowserWindow, session, shell } from 'electron';

import { applyCspHeaders } from './apply-csp-headers.js';
import type { CspMode } from './content-security-policy.js';
import { navigationPolicy } from './navigation-policy.js';
import { RENDERER_LIMITS } from './renderer-limits.js';
import { denyUnusedPermissions } from './renderer-permissions.js';
import { windowChromeOptions } from './window-chrome.js';
import { windowOpenHandler } from './window-open-handler.js';
import { WINDOW_SIZE } from './window-size.js';

/** What the app that hosts the window decides. Everything else is the same for both apps. */
export type CreateWindowOptions = {
    appId: string;
    title: string;
    /** Absent until an app has artwork of its own; the platform then draws its default. */
    icon?: string | undefined;
    preload: string;
    entryUrl: string;
    mode: CspMode;
    /** Told when the window is first shown; nothing by default. */
    onShown?: (() => void) | undefined;
};

/** The window and what it left outside itself: the handlers that live on the session. */
export type CreatedWindow = {
    window: BrowserWindow;
    dispose: () => void;
};

/**
 * Opens the only window an app has. Every renderer privilege is off and stays off, in
 * development too: the window cannot reach node, cannot open a second one, and cannot navigate
 * away from its own origin. DevTools are never opened from here; the developer asks for them.
 *
 * The nonce is not one of the options an app decides: it belongs to the run, and the host is
 * what serves the document that quotes it back.
 */
export function createWindow(options: CreateWindowOptions, cspNonce: string): CreatedWindow {
    app.setAppUserModelId(options.appId);

    const releaseCsp = applyCspHeaders(session.defaultSession.webRequest, options.mode, cspNonce);
    const releasePermissions = denyUnusedPermissions(session.defaultSession);

    const window = new BrowserWindow({
        ...WINDOW_SIZE,
        ...windowChromeOptions(),
        // Spread, not `icon: undefined`: Electron reads the key as "no icon at all" instead
        // of "the icon the platform gives an app that has none".
        ...(options.icon === undefined ? {} : { icon: options.icon }),
        title: options.title,
        // The window is painted before it is shown, so no user ever sees a white rectangle.
        show: false,
        webPreferences: {
            preload: options.preload,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
            ...RENDERER_LIMITS,
        },
    });

    guardNavigation(window, options.entryUrl);

    window.once('ready-to-show', () => {
        window.show();
        options.onShown?.();
    });

    void window.loadURL(options.entryUrl);

    return {
        window,
        dispose: () => {
            releaseCsp();
            releasePermissions();
        },
    };
}

function guardNavigation(window: BrowserWindow, appEntryUrl: string): void {
    const openExternal = (url: string): void => {
        void shell.openExternal(url);
    };

    window.webContents.setWindowOpenHandler(windowOpenHandler(openExternal));

    window.webContents.on('will-navigate', (event, url) => {
        if (navigationPolicy(url, appEntryUrl) === 'block') {
            event.preventDefault();
        }
    });
}
