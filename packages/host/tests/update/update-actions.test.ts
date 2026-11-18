import { describe, expect, it, vi } from 'vitest';

import { createUpdateActions } from '../../src/update/update-actions.js';

import { NEXT, start } from './handlers-harness.js';

describe('the actions the application menu and the window share', () => {
    it('hands the menu what the updates say at the start and at every change', () => {
        const harness = start();

        expect(harness.announce).toHaveBeenCalledTimes(1);
        expect(harness.announce.mock.calls[0]?.[0].state.phase).toBe('idle');

        harness.emit({ type: 'update-available', info: NEXT });

        expect(harness.announce).toHaveBeenCalledTimes(2);
        expect(harness.announce.mock.lastCall?.[0].state).toMatchObject({
            phase: 'available',
            next: { version: '0.2.0' },
        });
    });

    it('does for the menu what it does for the window: look, download, open the page', async () => {
        const harness = start();
        const { run } = harness.announce.mock.calls[0]?.[0] ?? { run: () => undefined };

        run('check');
        run('download');
        run('openPage');
        await Promise.resolve();
        await Promise.resolve();

        expect(harness.port.checkForUpdates).toHaveBeenCalledTimes(1);
        expect(harness.port.downloadUpdate).toHaveBeenCalledTimes(1);
        expect(harness.openExternal).toHaveBeenCalledWith('https://github.com/joalvm/mandor');
    });

    it('restarts only once a version is ready, as the window does', async () => {
        const harness = start();

        harness.announce.mock.lastCall?.[0].run('install');
        await Promise.resolve();

        expect(harness.port.quitAndInstall).not.toHaveBeenCalled();

        harness.emit({ type: 'update-available', info: NEXT });
        harness.emit({ type: 'update-downloaded', info: NEXT });
        harness.announce.mock.lastCall?.[0].run('install');
        await flush();

        expect(harness.settle).toHaveBeenCalledTimes(1);
        expect(harness.port.quitAndInstall).toHaveBeenCalledTimes(1);
    });

    it('does nothing for an install the library cannot serve', async () => {
        const harness = start('unsupported');

        harness.announce.mock.calls[0]?.[0].run('check');
        harness.announce.mock.calls[0]?.[0].run('download');
        await Promise.resolve();

        expect(harness.port.checkForUpdates).not.toHaveBeenCalled();
        expect(harness.port.downloadUpdate).not.toHaveBeenCalled();
    });
});

describe('the page of the app', () => {
    it('opens only when it is an https address', async () => {
        const openExternal = vi.fn(() => Promise.resolve());
        const actions = createUpdateActions({
            port: start().port,
            support: 'full',
            homepage: 'http://example.org',
            openExternal,
            settle: () => Promise.resolve(),
            state: () => ({ phase: 'idle', support: 'full', current: '0.1.0' }),
            ask: () => undefined,
        });

        await expect(actions.openPage()).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
        expect(openExternal).not.toHaveBeenCalled();
    });
});

async function flush(): Promise<void> {
    for (let turn = 0; turn < 6; turn += 1) {
        await Promise.resolve();
    }
}
