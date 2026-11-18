import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createOriginBridge } from '../../../src/preload/bridges/origin-bridge.js';
import { REFUSED, spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the origin bridge of the preload', () => {
    it('sends every call to the channel that carries its name', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createOriginBridge(createBridgeCall(ipc), ipc);

        await bridge.add({ name: 'Local work', url: 'C:/repos/local' });
        await bridge.empty({ id: 'local' });
        await bridge.list();
        await bridge.switch({ id: 'local' });

        expect(ipc.calls).toEqual([
            [CHANNELS.originAdd, { name: 'Local work', url: 'C:/repos/local' }],
            [CHANNELS.originEmpty, { id: 'local' }],
            [CHANNELS.originList, undefined],
            [CHANNELS.originSwitch, { id: 'local' }],
        ]);
    });

    /** The bridge adds no judgement of its own: the answer of main arrives whole. */
    it('hands back the answer of main untouched', async () => {
        const ipc = spyBridgeIpc();

        await expect(
            createOriginBridge(createBridgeCall(ipc), ipc).switch({
                id: 'local',
            }),
        ).resolves.toEqual(REFUSED);
    });

    it('asks main for the state of the open origin on its own channel', async () => {
        const ipc = spyBridgeIpc();

        await createOriginBridge(createBridgeCall(ipc), ipc).state();

        expect(ipc.calls).toEqual([[CHANNELS.originState, undefined]]);
    });

    it('delivers a state push validated, and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createOriginBridge(createBridgeCall(ipc), ipc).onStateChanged((push) =>
            seen.push(push),
        );

        ipc.emit(CHANNELS.originStateChanged, { state: 'clean', busy: true });
        stop();
        ipc.emit(CHANNELS.originStateChanged, { state: 'clean', busy: false });

        expect(seen).toEqual([{ state: 'clean', busy: true }]);
        expect(ipc.listeners.get(CHANNELS.originStateChanged)).toEqual([]);
    });

    it('throws on a state push that does not parse: it is a bug in main', () => {
        const ipc = spyBridgeIpc();

        createOriginBridge(createBridgeCall(ipc), ipc).onStateChanged(() => undefined);

        expect(() => {
            ipc.emit(CHANNELS.originStateChanged, { state: 'syncing' });
        }).toThrow();
    });
});
