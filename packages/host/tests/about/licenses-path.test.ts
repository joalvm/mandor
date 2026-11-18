import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { licensesPath } from '../../src/about/licenses-path.js';

describe('where the licenses of the install are', () => {
    it('is the folder the installer copied beside the app, once packaged', () => {
        expect(
            licensesPath({
                appPath: 'app',
                packaged: true,
                resourcesPath: join('opt', 'resources'),
            }),
        ).toBe(join('opt', 'resources', 'licenses'));
    });

    it('is the licence of the repo, two folders above the app, while it is developed', () => {
        expect(
            licensesPath({
                appPath: join('repo', 'apps', 'async'),
                packaged: false,
                resourcesPath: join('electron', 'resources'),
            }),
        ).toBe(join('repo', 'LICENSE'));
    });
});
