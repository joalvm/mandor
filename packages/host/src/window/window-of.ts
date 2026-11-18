import { BrowserWindow, type WebContents } from 'electron';

import type { WindowTarget } from './window.handlers.js';

/**
 * The one place main looks up a window, and it looks by the message itself: the `webContents`
 * that sent it. Every handler receives this resolved for its event, so no channel ever
 * carries a window the renderer chose.
 */
export function windowOf(event: unknown): WindowTarget | undefined {
    const sender = (event as { sender?: WebContents } | undefined)?.sender;

    if (sender === undefined) {
        return undefined;
    }

    return BrowserWindow.fromWebContents(sender) ?? undefined;
}
