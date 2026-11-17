import { describe, expect, it, vi } from 'vitest';

import { inertUpdatePort } from '../../src/update/update-port.js';

describe('the port of an install that cannot update', () => {
    it('says which version runs and finds and installs nothing', async () => {
        const port = inertUpdatePort('0.1.0');

        await expect(port.checkForUpdates()).resolves.toBeUndefined();
        await expect(port.downloadUpdate()).resolves.toBeUndefined();
        expect(port.currentVersion).toBe('0.1.0');
        expect(port.hasDownloaded()).toBe(false);
        expect(() => {
            port.quitAndInstall(true, true);
            port.setChannel('beta');
            port.setAutoDownload(true);
        }).not.toThrow();
    });

    it('never calls the listener, and its stop does nothing', () => {
        const heard = vi.fn();
        const stop = inertUpdatePort('0.1.0').onEvent(heard);

        stop();

        expect(heard).not.toHaveBeenCalled();
    });
});
