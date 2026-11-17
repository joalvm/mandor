import { describe, expect, it, vi } from 'vitest';

import { installNow, installOnQuit, isInstallRun } from '../../src/update/install-update.js';
import { inertUpdatePort, type UpdatePort } from '../../src/update/update-port.js';

function portWith(downloaded: boolean) {
    const quitAndInstall = vi.fn<UpdatePort['quitAndInstall']>();
    const port: UpdatePort = {
        ...inertUpdatePort('0.1.0'),
        hasDownloaded: () => downloaded,
        quitAndInstall,
    };

    return { port, quitAndInstall };
}

describe('installing a version', () => {
    it('settles what is written first, and then leaves, installs and opens again', async () => {
        const { port, quitAndInstall } = portWith(true);
        const order: string[] = [];

        quitAndInstall.mockImplementation(() => {
            order.push('installed');
        });

        await installNow(port, () => {
            order.push('settled');

            return Promise.resolve();
        });

        expect(order).toEqual(['settled', 'installed']);
        expect(quitAndInstall).toHaveBeenCalledWith(true, true);
    });

    it('takes the place of the exit when a version waits, and does not open again', () => {
        const { port, quitAndInstall } = portWith(true);

        installOnQuit(port);

        expect(quitAndInstall).toHaveBeenCalledWith(true, false);
    });

    it('leaves the exit alone when nothing waits', () => {
        const { port, quitAndInstall } = portWith(false);

        installOnQuit(port);

        expect(quitAndInstall).not.toHaveBeenCalled();
    });
});

describe('the start an AppImage install makes', () => {
    it('is told by the variable the updater sets, and only by its value true', () => {
        expect(isInstallRun({ APPIMAGE_EXIT_AFTER_INSTALL: 'true' })).toBe(true);
        expect(isInstallRun({ APPIMAGE_EXIT_AFTER_INSTALL: 'false' })).toBe(false);
        expect(isInstallRun({})).toBe(false);
    });
});
