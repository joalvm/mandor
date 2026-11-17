import { failure } from '@mandor/ipc';

import type { Logger } from '../log/create-logger.js';
import type { HandlerIpc } from './handler-ipc.js';

/** The part of the frame behind a call that says who wrote it: where it lives and whether it is on top. */
type SenderFrame = { origin: string; parent: unknown };

/**
 * Wraps `ipcMain` so a channel only answers the document of the app: the top frame of the
 * window, served from the origin of the renderer. The preload only runs there, so a call from
 * anywhere else (a frame inside the page, a page the window was driven to) is somebody who
 * should not have the bridge, and it gets a refusal and a line in the log instead of an answer.
 */
export function trustedSenderIpc(ipc: HandlerIpc, entryUrl: string, logger: Logger): HandlerIpc {
    const origin = rendererOriginOf(entryUrl);

    return {
        handle: (channel, listener) => {
            ipc.handle(channel, async (event, payload) => {
                const frame = senderFrameOf(event);

                if (!isAppDocument(frame, origin)) {
                    logger.log(
                        'warn',
                        `${channel} refused a call from ${frame?.origin ?? 'no frame'}`,
                    );

                    return failure(
                        'bad-request',
                        'the call did not come from the window of the app',
                    );
                }

                return listener(event, payload);
            });
        },
        removeHandler: (channel) => {
            ipc.removeHandler(channel);
        },
    };
}

/**
 * The origin as Chromium writes it for the frame. `URL.origin` will not do: the renderer
 * scheme of the app is not one the URL standard knows, and its origin there is opaque.
 */
function rendererOriginOf(entryUrl: string): string {
    const entry = new URL(entryUrl);

    return `${entry.protocol}//${entry.host}`;
}

/** The top frame, on the origin of the renderer: the only frame the preload runs in. */
function isAppDocument(frame: SenderFrame | null, origin: string): boolean {
    return frame?.parent === null && frame.origin === origin;
}

function senderFrameOf(event: unknown): SenderFrame | null {
    if (typeof event !== 'object' || event === null || !('senderFrame' in event)) {
        return null;
    }

    return frameOf(event.senderFrame);
}

/** Electron leaves no frame once the one that called has navigated away or gone. */
function frameOf(frame: unknown): SenderFrame | null {
    if (
        typeof frame !== 'object' ||
        frame === null ||
        !('origin' in frame) ||
        !('parent' in frame)
    ) {
        return null;
    }

    return typeof frame.origin === 'string' ? { origin: frame.origin, parent: frame.parent } : null;
}
