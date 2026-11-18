import type { Channel } from '@mandor/ipc';

import { redactMessage } from '../secret/redact-message.js';

/**
 * The slice of a `BrowserWindow` a push needs, named structurally: somewhere to send and a
 * way to know the window is still there.
 */
export type PushTarget = {
    isDestroyed: () => boolean;
    webContents: { send: (channel: Channel, message: unknown) => void };
};

/**
 * Sends a message to the renderer, or says nothing at all. A socket outlives the window it
 * was opened from: the user closes it and frames keep arriving. Sending to a window that is
 * gone throws inside Electron, and one throw in a socket callback takes the process with it.
 *
 * Every push leaves redacted. This is the single door from main to the window, so a secret
 * that reaches the renderer got there through some other door, and there is none.
 */
export function pushToWindow(target: PushTarget, channel: Channel, message: unknown): void {
    if (target.isDestroyed()) {
        return;
    }

    target.webContents.send(channel, redactMessage(message));
}
