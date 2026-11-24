import { BrowserWindow, type WebContents } from 'electron';

/**
 * The window Electron answers for a sender: the base class of the `BrowserWindow` the module
 * exports, which is what its own lookups hand back.
 */
export type SenderWindow = NonNullable<ReturnType<typeof BrowserWindow.fromWebContents>>;

/**
 * The one place main looks up a window, and it looks by the message itself: the `webContents`
 * that sent it. Every handler receives this resolved for its event, so no channel ever
 * carries a window the renderer chose.
 */
export function windowOf(event: unknown): SenderWindow | undefined {
    const sender = (event as { sender?: WebContents } | undefined)?.sender;

    if (sender === undefined) {
        return undefined;
    }

    return BrowserWindow.fromWebContents(sender) ?? undefined;
}
