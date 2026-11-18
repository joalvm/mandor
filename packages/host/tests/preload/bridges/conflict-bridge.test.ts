import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createConflictBridge } from '../../../src/preload/bridges/conflict-bridge.js';
import { createBridgeCall } from '../../../src/preload/bridge-call.js';
import { spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the conflict bridge of the preload', () => {
    it('lists, reads and closes through the channels that carry their names', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createConflictBridge(createBridgeCall(ipc), ipc);

        await bridge.list();
        await bridge.read({ id: 'a' });
        await bridge.resolve({ id: 'a', choices: { one: { pick: 'ours' } } });
        await bridge.keepMine({ id: 'a' });

        expect(ipc.calls).toEqual([
            [CHANNELS.conflictList, undefined],
            [CHANNELS.conflictRead, { id: 'a' }],
            [CHANNELS.conflictResolve, { id: 'a', choices: { one: { pick: 'ours' } } }],
            [CHANNELS.conflictKeepMine, { id: 'a' }],
        ]);
    });

    it('delivers the changed push and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createConflictBridge(createBridgeCall(ipc), ipc).onChanged((push) =>
            seen.push(push),
        );

        ipc.emit(CHANNELS.conflictChanged, {});
        stop();
        ipc.emit(CHANNELS.conflictChanged, {});

        expect(seen).toEqual([{}]);
        expect(ipc.listeners.get(CHANNELS.conflictChanged)).toEqual([]);
    });

    it('throws a push that does not parse, which is a bug in main', () => {
        const ipc = spyBridgeIpc();

        createConflictBridge(createBridgeCall(ipc), ipc).onChanged(() => undefined);

        expect(() => {
            ipc.emit(CHANNELS.conflictChanged, { id: 'a' });
        }).toThrow();
    });
});
