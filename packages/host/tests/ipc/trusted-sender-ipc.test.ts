import { CHANNELS, success, type Channel } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import type { HandlerIpc, IpcListener } from '../../src/ipc/handler-ipc.js';
import { trustedSenderIpc } from '../../src/ipc/trusted-sender-ipc.js';

const TOP = { parent: null };

/** `ipcMain` as Electron drives it: the event of a call carries the frame that made it. */
function setup(entryUrl: string) {
    const handlers = new Map<Channel, IpcListener>();
    const logged: [string, string][] = [];
    const bare: HandlerIpc = {
        handle: (channel, listener) => {
            handlers.set(channel, listener);
        },
        removeHandler: (channel) => {
            handlers.delete(channel);
        },
    };
    const ipc = trustedSenderIpc(bare, entryUrl, {
        log: (level, message) => {
            logged.push([level, message]);
        },
        flush: () => Promise.resolve(),
    });

    ipc.handle(CHANNELS.originList, () => Promise.resolve(success('answered')));

    return {
        logged,
        removeHandler: ipc.removeHandler,
        callFrom: (senderFrame: unknown) =>
            handlers.get(CHANNELS.originList)?.({ senderFrame }, undefined),
        registered: () => [...handlers.keys()],
    };
}

describe('answering only the document of the app', () => {
    it('answers the top frame of the packaged renderer', async () => {
        const ipc = setup('mandor://app/index.html');

        await expect(ipc.callFrom({ ...TOP, origin: 'mandor://app' })).resolves.toEqual(
            success('answered'),
        );
        expect(ipc.logged).toEqual([]);
    });

    it('answers the top frame of the development server', async () => {
        const ipc = setup('http://localhost:5173/');

        await expect(ipc.callFrom({ ...TOP, origin: 'http://localhost:5173' })).resolves.toEqual(
            success('answered'),
        );
    });

    it('refuses a frame inside the page, and writes down who asked', async () => {
        const ipc = setup('mandor://app/index.html');

        await expect(
            ipc.callFrom({ origin: 'mandor://app', parent: { origin: 'mandor://app' } }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
        expect(ipc.logged).toEqual([
            ['warn', `${CHANNELS.originList} refused a call from mandor://app`],
        ]);
    });

    it('refuses a page of another origin the window was driven to', async () => {
        const ipc = setup('mandor://app/index.html');

        await expect(
            ipc.callFrom({ ...TOP, origin: 'https://example.com' }),
        ).resolves.toMatchObject({
            ok: false,
        });
    });

    it('refuses a call whose frame is already gone', async () => {
        const ipc = setup('mandor://app/index.html');

        await expect(ipc.callFrom(null)).resolves.toMatchObject({ ok: false });
        expect(ipc.logged[0]?.[1]).toContain('no frame');
    });

    it('takes the channel away when asked', () => {
        const ipc = setup('mandor://app/index.html');

        ipc.removeHandler(CHANNELS.originList);

        expect(ipc.registered()).toEqual([]);
    });
});
