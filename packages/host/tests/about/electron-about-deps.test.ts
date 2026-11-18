import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { electronAboutDeps } from '../../src/about/electron-about-deps.js';

const openPath = vi.hoisted(() =>
    vi.fn<(path: string) => Promise<string>>(() => Promise.resolve('')),
);

vi.mock('electron', () => ({
    app: { getAppPath: () => 'repo/apps/async', getVersion: () => '0.3.0', isPackaged: false },
    shell: { openPath },
}));

describe('the About dependencies over the real app', () => {
    it('name the app as the host was told to, with the version and the system under it', () => {
        const about = electronAboutDeps('Mandor Realtime').about();

        expect(about).toMatchObject({
            name: 'Mandor Realtime',
            node: process.versions.node,
            platform: process.platform,
            version: '0.3.0',
        });
    });

    it('show the licence of the repo while the app is developed, and hand back why it failed', async () => {
        openPath.mockResolvedValueOnce('no application');

        await expect(electronAboutDeps('Mandor Realtime').showLicenses()).resolves.toBe(
            'no application',
        );
        expect(openPath).toHaveBeenCalledWith(join('repo', 'LICENSE'));
    });
});
