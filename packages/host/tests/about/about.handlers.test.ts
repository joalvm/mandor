import { CHANNELS, type AppAbout } from '@mandor/ipc';
import { describe, expect, it, vi } from 'vitest';

import { registerAboutHandlers } from '../../src/about/about.handlers.js';
import { spyIpc } from '../../src/testing/handler-harness.js';

const ABOUT: AppAbout = {
    arch: 'x64',
    chrome: '140.0.0.0',
    electron: '40.0.0',
    icon: '',
    name: 'Mandor Realtime',
    node: '24.0.0',
    platform: 'win32',
    system: '10.0.26100',
    version: '0.1.0',
};

function registered(showLicenses: () => Promise<string> = () => Promise.resolve('')) {
    const ipc = spyIpc();
    const dispose = registerAboutHandlers(ipc, { about: () => ABOUT, showLicenses });

    return { dispose, ipc };
}

describe('the About handlers', () => {
    it('tell who the app is, as the process reports it', async () => {
        await expect(registered().ipc.call(CHANNELS.appAbout)).resolves.toEqual({
            ok: true,
            value: ABOUT,
        });
    });

    it('refuse a question that carries anything', async () => {
        const { ipc } = registered();

        await expect(ipc.call(CHANNELS.appAbout, { path: 'C:/' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
        await expect(ipc.call(CHANNELS.appOpenLicenses, { path: 'C:/' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });

    it('show the licenses and answer with nothing to say', async () => {
        const showLicenses = vi.fn(() => Promise.resolve(''));
        const { ipc } = registered(showLicenses);

        await expect(ipc.call(CHANNELS.appOpenLicenses)).resolves.toEqual({ ok: true, value: {} });
        expect(showLicenses).toHaveBeenCalledOnce();
    });

    it('answer why the licenses could not be shown', async () => {
        const { ipc } = registered(() => Promise.resolve('no such file'));

        await expect(ipc.call(CHANNELS.appOpenLicenses)).resolves.toEqual({
            ok: false,
            error: { code: 'unknown', message: 'no such file' },
        });
    });

    it('leave no channel registered once disposed', () => {
        const { dispose, ipc } = registered();

        dispose();

        expect(ipc.registered()).toEqual([]);
    });
});
