import { CHANNELS } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { NEXT, start, stateOf, type Harness } from './handlers-harness.js';

let live: Harness;

beforeEach(() => {
    live = start();
});

afterEach(() => {
    live.dispose();
});

describe('the update handlers', () => {
    it('answers with the state main keeps, as the schema of the channel reads it', async () => {
        await expect(stateOf(live)).resolves.toEqual({
            phase: 'idle',
            support: 'full',
            current: '0.1.0',
        });

        live.emit({ type: 'update-downloaded', info: NEXT });

        await expect(stateOf(live)).resolves.toMatchObject({ phase: 'ready', next: NEXT });
    });

    it('pushes the whole state at every event of the updater', () => {
        live.emit({ type: 'checking-for-update' });
        live.emit({ type: 'update-available', info: NEXT });

        expect(live.window.sent).toEqual([
            [CHANNELS.updateChanged, expect.objectContaining({ phase: 'checking' })],
            [CHANNELS.updateChanged, expect.objectContaining({ phase: 'available', next: NEXT })],
        ]);
    });

    it('looks for a version when the person asks, and answers when the look is over', async () => {
        await expect(live.ipc.call(CHANNELS.updateCheck)).resolves.toEqual({
            ok: true,
            value: {},
        });
        expect(live.port.checkForUpdates).toHaveBeenCalledTimes(1);
    });

    it('tells the person when a look they asked for failed, and only then', async () => {
        await live.ipc.call(CHANNELS.updateCheck);
        live.emit({ type: 'error', code: 'request-unreachable' });
        live.emit({ type: 'error', code: 'request-unreachable' });

        expect(live.outbox.raise).toHaveBeenCalledTimes(1);
        expect(live.outbox.raise).toHaveBeenCalledWith('update-failed', 'error');
    });

    it('keeps quiet about a failed look that nobody asked for', () => {
        live.emit({ type: 'checking-for-update' });
        live.emit({ type: 'error', code: 'request-unreachable' });

        expect(live.outbox.raise).not.toHaveBeenCalled();
    });

    it('downloads when the person asks and the install can', async () => {
        await live.ipc.call(CHANNELS.updateDownload);

        expect(live.port.downloadUpdate).toHaveBeenCalledTimes(1);
    });

    it('installs only a version that is ready', async () => {
        await live.ipc.call(CHANNELS.updateInstall);

        expect(live.port.quitAndInstall).not.toHaveBeenCalled();

        live.emit({ type: 'update-downloaded', info: NEXT });
        await live.ipc.call(CHANNELS.updateInstall);

        expect(live.port.quitAndInstall).toHaveBeenCalledWith(true, true);
    });

    it('lets what is written reach the disk before the install takes the app away', async () => {
        const order: string[] = [];

        live.settle.mockImplementation(() => {
            order.push('settled');

            return Promise.resolve();
        });
        live.port.quitAndInstall.mockImplementation(() => {
            order.push('installed');
        });
        live.emit({ type: 'update-downloaded', info: NEXT });
        await live.ipc.call(CHANNELS.updateInstall);

        expect(order).toEqual(['settled', 'installed']);
    });

    it('opens the page of the app, which the app fixed and the window cannot change', async () => {
        await live.ipc.call(CHANNELS.updateOpenPage, {});

        expect(live.openExternal).toHaveBeenCalledWith('https://github.com/joalvm/mandor');
        await expect(
            live.ipc.call(CHANNELS.updateOpenPage, { url: 'https://evil.example' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('hands the choice of the person to the schedule, and refuses one it cannot read', async () => {
        const choice = { mode: 'notify', channel: 'beta' };

        await expect(live.ipc.call(CHANNELS.updateConfigure, choice)).resolves.toEqual({
            ok: true,
            value: {},
        });
        await expect(
            live.ipc.call(CHANNELS.updateConfigure, { mode: 'always', channel: 'beta' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });

        expect(live.schedule.configure).toHaveBeenCalledOnce();
        expect(live.schedule.configure).toHaveBeenCalledWith(choice);
    });

    it('refuses a request that carries anything', async () => {
        await expect(live.ipc.call(CHANNELS.updateCheck, { path: '/etc' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });

    it('leaves no channel behind and stops listening when it is undone', () => {
        live.dispose();
        live.emit({ type: 'checking-for-update' });

        expect(live.ipc.registered()).toEqual([]);
        expect(live.schedule.dispose).toHaveBeenCalledOnce();
        expect(live.window.sent).toEqual([]);
    });
});
