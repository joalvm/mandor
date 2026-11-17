import { existsSync, readFileSync } from 'node:fs';

import { app, shell } from 'electron';

import { settle } from '../runtime/hold-quit-for-session.js';
import type { Logger } from '../log/create-logger.js';
import { createUpdateDeps } from './create-update-deps.js';

/** `createUpdateDeps` over the real app: its version, its install and the browser of the system. */
export function electronUpdateDeps(logger: Logger, homepage: string) {
    return createUpdateDeps({
        packaged: app.isPackaged,
        platform: process.platform,
        resourcesPath: process.resourcesPath,
        env: process.env,
        exists: existsSync,
        read: (path) => readFileSync(path, 'utf8'),
        homepage,
        logger,
        openExternal: (url) => shell.openExternal(url),
        settle,
        version: app.getVersion(),
    });
}
