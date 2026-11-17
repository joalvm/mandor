import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../src/log/create-logger.js';
import { createUpdateDeps, type UpdateDepsInput } from '../../src/update/create-update-deps.js';
import { createElectronUpdaterPort } from '../../src/update/electron-updater-port.js';
import { inertUpdatePort } from '../../src/update/update-port.js';

vi.mock('../../src/update/electron-updater-port.js', () => ({
    createElectronUpdaterPort: vi.fn(() => ({ currentVersion: 'from-the-library' })),
}));

const logger: Logger = { log: () => undefined, flush: () => Promise.resolve() };

function input(change: Partial<UpdateDepsInput>): UpdateDepsInput {
    return {
        packaged: true,
        platform: 'win32',
        resourcesPath: '/app/resources',
        env: {},
        exists: () => true,
        read: () => '',
        homepage: 'https://example.org/app',
        logger,
        openExternal: () => Promise.resolve(),
        settle: () => Promise.resolve(),
        version: '0.1.0',
        ...change,
    };
}

describe('the dependencies of the update handlers', () => {
    it('serves an install with a feed through the library', () => {
        const deps = createUpdateDeps(input({}));

        expect(deps.support).toBe('full');
        expect(deps.port).toEqual({ currentVersion: 'from-the-library' });
        expect(createElectronUpdaterPort).toHaveBeenCalledWith(logger, '0.1.0');
    });

    it('gives an install that cannot update the inert port and never loads the library', () => {
        vi.mocked(createElectronUpdaterPort).mockClear();

        const deps = createUpdateDeps(input({ packaged: false }));

        expect(deps.support).toBe('unsupported');
        expect(deps.port.currentVersion).toBe(inertUpdatePort('0.1.0').currentVersion);
        expect(createElectronUpdaterPort).not.toHaveBeenCalled();
    });

    it('installs on quit only a version that was downloaded', () => {
        const deps = createUpdateDeps(input({ packaged: false }));
        const quitAndInstall = vi.spyOn(deps.port, 'quitAndInstall');

        deps.installOnQuit();

        expect(quitAndInstall).not.toHaveBeenCalled();
    });

    it('brings the schedule of the looks, which waits for a window that is ready', () => {
        const deps = createUpdateDeps(input({ packaged: false }));

        expect(() => {
            deps.schedule.ready();
            deps.schedule.dispose();
        }).not.toThrow();
    });

    it('hands on the page and the way to open it', () => {
        const openExternal = vi.fn(() => Promise.resolve());
        const deps = createUpdateDeps(input({ openExternal }));

        expect(deps.homepage).toBe('https://example.org/app');
        expect(deps.openExternal).toBe(openExternal);
    });
});
