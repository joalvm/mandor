import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { electronAboutDeps } from '../../src/about/electron-about-deps.js';

const openPath = vi.hoisted(() =>
    vi.fn<(path: string) => Promise<string>>(() => Promise.resolve('')),
);

/** What the image library makes of a path: a picture only where the install keeps the icon. */
const createFromPath = vi.hoisted(() =>
    vi.fn((path: string) => ({
        isEmpty: () => path !== 'resources/icon.png',
        resize: (size: { width: number }) => ({
            toDataURL: () => `data:image/png;base64,${String(size.width)}`,
        }),
    })),
);

vi.mock('electron', () => ({
    app: { getAppPath: () => 'repo/apps/async', getVersion: () => '0.3.0', isPackaged: false },
    nativeImage: { createFromPath },
    shell: { openPath },
}));

// Electron puts the version of the system on the process; plain Node has nothing there.
beforeEach(() => {
    Reflect.set(process, 'getSystemVersion', () => '10.0.26100');
});

afterEach(() => {
    Reflect.deleteProperty(process, 'getSystemVersion');
});

describe('the About dependencies over the real app', () => {
    it('name the app as the host was told to, with the version and the system under it', () => {
        const about = electronAboutDeps('Mandor Realtime').about();

        expect(about).toMatchObject({
            arch: process.arch,
            icon: '',
            name: 'Mandor Realtime',
            node: process.versions.node,
            platform: process.platform,
            system: '10.0.26100',
            version: '0.3.0',
        });
    });

    /** Drawn at 64 pixels, it is carried at 128 so a dense screen does not blur it. */
    it('carry the mark of the app as an image the window draws, when the install has one', () => {
        expect(electronAboutDeps('Mandor Realtime', 'resources/icon.png').about().icon).toBe(
            'data:image/png;base64,128',
        );
        expect(electronAboutDeps('Mandor Realtime', 'resources/missing.png').about().icon).toBe('');
    });

    it('show the licence of the repo while the app is developed, and hand back why it failed', async () => {
        openPath.mockResolvedValueOnce('no application');

        await expect(electronAboutDeps('Mandor Realtime').showLicenses()).resolves.toBe(
            'no application',
        );
        expect(openPath).toHaveBeenCalledWith(join('repo', 'LICENSE'));
    });
});
