import { basename } from 'node:path';

import { createI18n } from '@mandor/i18n';
import { describe, expect, it, vi } from 'vitest';

import { ASYNC_HANDLERS } from '../../../src/main/async-handlers.js';
import { ASYNC_FORMATS } from '../../../src/main/formats.js';
import { ASYNC_HOST_OPTIONS } from '../../../src/main/host-options.js';

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

describe('what Mandor Realtime asks of the host', () => {
    it('is the realtime app, under its own id', () => {
        expect(ASYNC_HOST_OPTIONS.kind).toBe('async');
        expect(ASYNC_HOST_OPTIONS.appId).toBe('com.mandor.async');
    });

    it('serves connections and messages, and no request', () => {
        expect(ASYNC_HOST_OPTIONS.stores).toEqual(['message', 'connection']);
    });

    it('lets a folder carry only a description and variables', () => {
        expect(ASYNC_HOST_OPTIONS.folderSettings).toEqual(['description', 'variables']);
    });

    it('hands over its own formats and handlers', () => {
        expect(ASYNC_HOST_OPTIONS.formats).toBe(ASYNC_FORMATS);
        expect(ASYNC_HOST_OPTIONS.handlers).toBe(ASYNC_HANDLERS);
    });

    it('names the window and the product in the language of the menu', () => {
        const messages = createI18n();

        expect(ASYNC_HOST_OPTIONS.productName).toBe(messages.t('menu:appAsync'));
        expect(ASYNC_HOST_OPTIONS.title).toBe(messages.t('async:windowTitle'));
    });

    /** An install that cannot update by itself lands where the installers are, not on the code. */
    it('sends an install that cannot update by itself to the releases', () => {
        expect(ASYNC_HOST_OPTIONS.homepage).toBe('https://github.com/joalvm/mandor/releases');
    });

    it('takes the icon from the resources next to the main directory', () => {
        expect(basename(ASYNC_HOST_OPTIONS.icon)).toBe('icon.png');
        expect(ASYNC_HOST_OPTIONS.mainDir).toBeTruthy();
    });
});
