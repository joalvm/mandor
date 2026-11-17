import { CHANNELS } from '@mandor/ipc';

import { redactMessage } from '../secret/redact-message.js';
import type { HandlerIpc } from './handler-ipc.js';

/**
 * Wraps `ipcMain` so every answer leaves redacted. The handlers register through this and
 * never through the bare object: redaction that each handler had to remember is redaction
 * that one handler forgets, and the answer of a channel is a border out of the process the
 * same as a file is.
 *
 * The reveal channel answers untouched. It is the one call whose whole purpose is to give a
 * secret to the owner who asked for it by name, and it says so in the log when it does.
 */
export function redactedIpc(ipc: HandlerIpc): HandlerIpc {
    return {
        handle: (channel, listener) => {
            if (channel === CHANNELS.secretReveal) {
                ipc.handle(channel, listener);

                return;
            }

            ipc.handle(channel, async (event, payload) =>
                redactMessage(await listener(event, payload)),
            );
        },
        removeHandler: (channel) => {
            ipc.removeHandler(channel);
        },
    };
}
