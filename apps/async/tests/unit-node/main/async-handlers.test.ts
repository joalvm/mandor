import type { AppHandlerContext } from '@mandor/host';
import { noScripts, silentNotices, spyIpc } from '@mandor/host/testing';
import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it, vi } from 'vitest';

import { ASYNC_HANDLERS } from '../../../src/main/async-handlers.js';

// Registering opens no dialog and no socket: the doubles only have to exist.
vi.mock('electron', () => ({
    app: {},
    BrowserWindow: {},
    dialog: {},
    ipcMain: {},
    Menu: {},
    net: {},
    protocol: {},
    safeStorage: {},
    session: {},
    shell: {},
}));

const CONTEXT: AppHandlerContext = {
    userDataDir: 'user-data',
    ...noScripts(),
    logger: { log: () => undefined, flush: () => Promise.resolve() },
    window: {
        isDestroyed: () => false,
        isMaximized: () => false,
        on: () => undefined,
        webContents: { send: () => undefined },
    },
    notices: silentNotices(),
};

describe('the handlers only Async has', () => {
    it('answers the sockets, the recording and the connections', () => {
        const ipc = spyIpc();

        ASYNC_HANDLERS.flatMap((register) => register(ipc, CONTEXT));

        expect(ipc.registered()).toEqual(
            expect.arrayContaining([
                CHANNELS.wsOpen,
                CHANNELS.wsSend,
                CHANNELS.recordStart,
                CHANNELS.connectionCreate,
                CHANNELS.exportJsonl,
            ]),
        );
    });

    it('leaves nothing registered once undone', () => {
        const ipc = spyIpc();
        const disposers = ASYNC_HANDLERS.flatMap((register) => register(ipc, CONTEXT));

        for (const dispose of disposers) {
            dispose();
        }

        expect(ipc.registered()).toEqual([]);
    });
});
