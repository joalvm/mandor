import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createNoticeBridge } from '../../../src/preload/bridges/notice-bridge.js';
import { spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

const NOTICE = { id: 1, code: 'files-unreadable', tone: 'warning' };

describe('the notice bridge of the preload', () => {
    it('asks for the list on the channel that carries its name', async () => {
        const ipc = spyBridgeIpc();

        await createNoticeBridge(createBridgeCall(ipc), ipc).list();

        expect(ipc.calls).toEqual([[CHANNELS.noticeList, undefined]]);
    });

    it('delivers a validated push and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createNoticeBridge(createBridgeCall(ipc), ipc).onRaised((push) =>
            seen.push(push),
        );

        ipc.emit(CHANNELS.noticeRaised, NOTICE);
        stop();
        ipc.emit(CHANNELS.noticeRaised, NOTICE);

        expect(seen).toEqual([NOTICE]);
        expect(ipc.listeners.get(CHANNELS.noticeRaised)).toEqual([]);
    });

    it('throws a push with a code or a text it does not know, which is a bug in main', () => {
        const ipc = spyBridgeIpc();

        createNoticeBridge(createBridgeCall(ipc), ipc).onRaised(() => undefined);

        expect(() => {
            ipc.emit(CHANNELS.noticeRaised, { ...NOTICE, code: 'made-up' });
        }).toThrow();
        expect(() => {
            ipc.emit(CHANNELS.noticeRaised, { ...NOTICE, title: 'No se pudo' });
        }).toThrow();
    });
});
