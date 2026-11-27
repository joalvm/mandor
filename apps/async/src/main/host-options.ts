import { join } from 'node:path';

import type { StartHostConfig } from '@mandor/host';
import { createI18n } from '@mandor/i18n';
import { ASYNC_HANDLERS } from './async-handlers.js';
import { ASYNC_FORMATS } from './formats.js';

const messages = createI18n();
// ESM in the main process: the directory comes from the module, and the shim the bundler used
// to inject is one graph shape away from vanishing.
const mainDir = import.meta.dirname;

export const ASYNC_HOST_OPTIONS = {
    appId: 'com.mandor.async',
    formats: ASYNC_FORMATS,
    handlers: ASYNC_HANDLERS,
    // Events travel through connections: HTTP requests have no place here.
    stores: ['message', 'connection'],
    // A connection sends no request: an auth or a header on a folder would mean nothing here.
    folderSettings: ['description', 'variables'],
    homepage: 'https://joalvm.github.io/mandor/#realtime',
    icon: join(mainDir, '../../resources/icon.png'),
    kind: 'async',
    mainDir,
    productName: messages.t('menu:appAsync'),
    // The folder a person finds on disk carries the name of the app, not the one of the code.
    repoFolder: 'realtime',
    title: messages.t('async:windowTitle'),
} satisfies StartHostConfig;
