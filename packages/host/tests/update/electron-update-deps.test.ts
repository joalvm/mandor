import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../src/log/create-logger.js';
import { electronUpdateDeps } from '../../src/update/electron-update-deps.js';

const openExternal = vi.hoisted(() =>
    vi.fn<(url: string) => Promise<void>>(() => Promise.resolve()),
);

vi.mock('electron', () => ({
    app: { isPackaged: false, getVersion: () => '0.3.0' },
    shell: { openExternal },
}));

const logger: Logger = { log: () => undefined, flush: () => Promise.resolve() };

describe('the update dependencies over the real app', () => {
    it('takes the version of the app and finds an unpackaged app unable to update', () => {
        const deps = electronUpdateDeps(logger, 'https://example.org/app');

        expect(deps.port.currentVersion).toBe('0.3.0');
        expect(deps.support).toBe('unsupported');
        expect(deps.homepage).toBe('https://example.org/app');
    });

    it('opens a page in the browser of the system', async () => {
        await electronUpdateDeps(logger, 'https://example.org/app').openExternal('https://a.test');

        expect(openExternal).toHaveBeenCalledWith('https://a.test');
    });
});
