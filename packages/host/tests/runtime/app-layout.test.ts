import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { appLayout } from '../../src/runtime/app-layout.js';

const MAIN = join('/', 'apps', 'async', 'out', 'main');

describe('appLayout', () => {
    it('finds the built renderer and the preload beside the main of the app', () => {
        const layout = appLayout(MAIN, undefined);

        expect(layout.entryUrl).toBe(
            pathToFileURL(join(MAIN, '../renderer/index.html')).toString(),
        );
        expect(layout.preload).toBe(join(MAIN, '../preload/expose-bridge.cjs'));
        expect(layout.mode).toBe('production');
        expect(layout.importWorker).toBe(join(MAIN, 'import-worker.js'));
        expect(layout.scriptWorker).toBe(join(MAIN, 'script-worker.js'));
    });

    it('takes the renderer from the development server while one runs', () => {
        const layout = appLayout(MAIN, 'http://localhost:5173');

        expect(layout.entryUrl).toBe('http://localhost:5173');
        expect(layout.preload).toBe(join(MAIN, '../preload/expose-bridge.cjs'));
        expect(layout.mode).toBe('development');
    });
});
