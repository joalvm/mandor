import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { createUpdateBridge } from '../../../src/preload/bridges/update-bridge.js';
import { spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

const STATE = { phase: 'ready', support: 'full', current: '0.1.0' };

describe('the update bridge of the preload', () => {
    it('asks on the channel that carries the name of each verb', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createUpdateBridge(createBridgeCall(ipc), ipc);

        await bridge.state();
        await bridge.configure({ mode: 'auto', channel: 'stable' });
        await bridge.check();
        await bridge.download();
        await bridge.install();
        await bridge.openPage();

        expect(ipc.calls).toEqual([
            [CHANNELS.updateState, undefined],
            [CHANNELS.updateConfigure, { mode: 'auto', channel: 'stable' }],
            [CHANNELS.updateCheck, undefined],
            [CHANNELS.updateDownload, undefined],
            [CHANNELS.updateInstall, undefined],
            [CHANNELS.updateOpenPage, undefined],
        ]);
    });

    it('delivers a validated push and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createUpdateBridge(createBridgeCall(ipc), ipc).onChanged((state) =>
            seen.push(state),
        );

        ipc.emit(CHANNELS.updateChanged, STATE);
        stop();
        ipc.emit(CHANNELS.updateChanged, STATE);

        expect(seen).toEqual([STATE]);
        expect(ipc.listeners.get(CHANNELS.updateChanged)).toEqual([]);
    });

    it('throws a push with a phase it does not know, which is a bug in main', () => {
        const ipc = spyBridgeIpc();

        createUpdateBridge(createBridgeCall(ipc), ipc).onChanged(() => undefined);

        expect(() => {
            ipc.emit(CHANNELS.updateChanged, { ...STATE, phase: 'installing' });
        }).toThrow();
    });
});
