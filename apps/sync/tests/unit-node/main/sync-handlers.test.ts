import type { AppHandlerContext } from '@mandor/host';
import { noScripts, silentNotices, spyIpc } from '@mandor/host/testing';
import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it, vi } from 'vitest';

import { SYNC_HANDLERS } from '../../../src/main/sync-handlers.js';

// Registering opens no dialog and sends nothing: the doubles only have to exist.
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

describe('the handlers only Sync has', () => {
    it('answers the five channels of a request, the three of the history, the two of a schema, the four of the cookies and the two of codegen', () => {
        const ipc = spyIpc();

        SYNC_HANDLERS.flatMap((register) => register(ipc, CONTEXT));

        expect(ipc.registered()).toEqual([
            CHANNELS.requestSend,
            CHANNELS.requestCancel,
            CHANNELS.requestBodyRead,
            CHANNELS.requestBodySave,
            CHANNELS.requestHideSecrets,
            CHANNELS.historyList,
            CHANNELS.historyRead,
            CHANNELS.historyDelete,
            CHANNELS.graphqlSchemaRead,
            CHANNELS.graphqlIntrospect,
            CHANNELS.cookiesList,
            CHANNELS.cookiesSet,
            CHANNELS.cookiesDelete,
            CHANNELS.cookiesClear,
            CHANNELS.codegenFromCurl,
            CHANNELS.codegenSnippet,
        ]);
    });

    it('leaves nothing registered once undone', () => {
        const ipc = spyIpc();
        const disposers = SYNC_HANDLERS.flatMap((register) => register(ipc, CONTEXT));

        for (const dispose of disposers) {
            dispose();
        }

        expect(ipc.registered()).toEqual([]);
    });
});
