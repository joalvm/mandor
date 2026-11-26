import { join } from 'node:path';

import type { StartHostConfig } from '@mandor/host';
import { createI18n } from '@mandor/i18n';
import { SYNC_FORMATS } from './formats.js';
import { forgetWorkspaceHistory } from './history/delete-history.js';
import { SYNC_HANDLERS } from './sync-handlers.js';

const messages = createI18n();
// ESM in the main process: the directory comes from the module, not from a bundler shim.
const mainDir = import.meta.dirname;

/** What Mandor Request decides for itself, and nothing more: its formats, its handlers and its logo. */
export const SYNC_HOST_OPTIONS = {
    appId: 'com.mandor.sync',
    formats: SYNC_FORMATS,
    // The history of a workspace and its bodies live outside its folder, and go with it.
    forgetWorkspace: forgetWorkspaceHistory,
    handlers: SYNC_HANDLERS,
    // Requests carry their own destination: connections and their messages have no place here.
    stores: ['request'],
    folderSettings: ['description', 'variables', 'auth', 'headers'],
    homepage: 'https://github.com/joalvm/mandor/releases',
    icon: join(mainDir, '../../resources/icon.png'),
    kind: 'sync',
    mainDir,
    productName: messages.t('menu:appSync'),
    // The folder a person finds on disk carries the name of the app, not the one of the code.
    repoFolder: 'request',
    title: messages.t('sync:windowTitle'),
} satisfies StartHostConfig;
