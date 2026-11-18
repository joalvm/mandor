import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { CspMode } from '../window/content-security-policy.js';

/** The pieces of an app the window needs, where the bundler left them. */
export type AppLayout = {
    entryUrl: string;
    preload: string;
    mode: CspMode;
    /** The worker every import reads its files in, a bundle beside main. */
    importWorker: string;
    /** The worker every script runs in, a bundle beside main. */
    scriptWorker: string;
};

/**
 * The renderer, the preload and the policy of an app, found from the directory its main runs
 * in. Both apps are laid out alike by the same bundler, so each of them spelling these out was
 * the same lines twice. The development server is the one thing that changes them: while it
 * runs, the renderer comes from it and the policy has to let it in.
 */
export function appLayout(mainDir: string, devServerUrl: string | undefined): AppLayout {
    return {
        entryUrl: devServerUrl ?? pathToFileURL(join(mainDir, '../renderer/index.html')).toString(),
        preload: join(mainDir, '../preload/expose-bridge.cjs'),
        mode: devServerUrl === undefined ? 'production' : 'development',
        importWorker: join(mainDir, 'import-worker.js'),
        scriptWorker: join(mainDir, 'script-worker.js'),
    };
}
