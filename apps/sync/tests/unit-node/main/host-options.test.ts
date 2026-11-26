import { basename } from 'node:path';

import { createI18n } from '@mandor/i18n';
import { describe, expect, it, vi } from 'vitest';

import { SYNC_FORMATS } from '../../../src/main/formats.js';
import { forgetWorkspaceHistory } from '../../../src/main/history/delete-history.js';
import { SYNC_HOST_OPTIONS } from '../../../src/main/host-options.js';
import { SYNC_HANDLERS } from '../../../src/main/sync-handlers.js';

// Loading the handlers touches the desktop runtime: the doubles only have to exist.
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

describe('what Mandor Request asks of the host', () => {
    it('is the request app, under its own id', () => {
        expect(SYNC_HOST_OPTIONS.kind).toBe('sync');
        expect(SYNC_HOST_OPTIONS.appId).toBe('com.mandor.sync');
    });

    it('serves requests, and no connection', () => {
        expect(SYNC_HOST_OPTIONS.stores).toEqual(['request']);
    });

    it('lets a folder carry the settings its requests inherit', () => {
        expect(SYNC_HOST_OPTIONS.folderSettings).toEqual([
            'description',
            'variables',
            'auth',
            'headers',
        ]);
    });

    it('hands over its own formats and handlers', () => {
        expect(SYNC_HOST_OPTIONS.formats).toBe(SYNC_FORMATS);
        expect(SYNC_HOST_OPTIONS.handlers).toBe(SYNC_HANDLERS);
    });

    it('takes the history of a workspace with it when the workspace goes', () => {
        expect(SYNC_HOST_OPTIONS.forgetWorkspace).toBe(forgetWorkspaceHistory);
    });

    it('names the window and the product in the language of the menu', () => {
        const messages = createI18n();

        expect(SYNC_HOST_OPTIONS.productName).toBe(messages.t('menu:appSync'));
        expect(SYNC_HOST_OPTIONS.title).toBe(messages.t('sync:windowTitle'));
    });

    /** An install that cannot update by itself lands where the installers are, not on the code. */
    it('sends an install that cannot update by itself to the releases', () => {
        expect(SYNC_HOST_OPTIONS.homepage).toBe('https://github.com/joalvm/mandor/releases');
    });

    it('takes the icon from the resources next to the main directory', () => {
        expect(basename(SYNC_HOST_OPTIONS.icon)).toBe('icon.png');
        expect(SYNC_HOST_OPTIONS.mainDir).toBeTruthy();
    });
});
