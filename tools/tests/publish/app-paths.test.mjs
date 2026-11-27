import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { appPaths } from '../../publish/app-paths.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('the folders whose commits change what an app ships', () => {
    it('start with the app and hold the packages both apps run', () => {
        for (const folder of ['async', 'sync']) {
            const paths = appPaths(ROOT, folder);

            expect(paths[0]).toBe(`apps/${folder}`);
            expect(paths).toEqual(expect.arrayContaining(['packages/host', 'packages/schema']));
        }
    });

    it('leave out the transport of the other app', () => {
        expect(appPaths(ROOT, 'async')).not.toContain('packages/transport-sync');
        expect(appPaths(ROOT, 'async')).toContain('packages/transport-async');
        expect(appPaths(ROOT, 'sync')).not.toContain('packages/transport-async');
        expect(appPaths(ROOT, 'sync')).toContain('packages/transport-sync');
    });
});
