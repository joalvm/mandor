import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createRepoBridge } from '../../../src/preload/bridges/repo-bridge.js';
import { spyBridgeIpc } from '../../../src/testing/spy-bridge-ipc.js';

describe('the repo bridge of the preload', () => {
    it('delivers the changed push and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createRepoBridge(ipc).onChanged((push) => seen.push(push));

        ipc.emit(CHANNELS.repoChanged, { changes: [{ area: 'repo' }] });
        stop();
        ipc.emit(CHANNELS.repoChanged, { changes: [] });

        expect(seen).toEqual([{ changes: [{ area: 'repo' }] }]);
        expect(ipc.listeners.get(CHANNELS.repoChanged)).toEqual([]);
    });

    it('delivers the clash push and stops at the unsubscribe', () => {
        const ipc = spyBridgeIpc();
        const seen: unknown[] = [];
        const stop = createRepoBridge(ipc).onConflictRecorded((push) => seen.push(push));

        ipc.emit(CHANNELS.conflictRecorded, { entity: { area: 'repo' }, name: '' });
        stop();
        ipc.emit(CHANNELS.conflictRecorded, { entity: { area: 'repo' }, name: '' });

        expect(seen).toEqual([{ entity: { area: 'repo' }, name: '' }]);
    });

    it('refuses pushes that do not match their schema', () => {
        const ipc = spyBridgeIpc();
        const bridge = createRepoBridge(ipc);

        bridge.onChanged(() => undefined);
        bridge.onConflictRecorded(() => undefined);

        expect(() => {
            ipc.emit(CHANNELS.repoChanged, { changes: 'all' });
        }).toThrow();
        expect(() => {
            ipc.emit(CHANNELS.conflictRecorded, { entity: 'a', name: '' });
        }).toThrow();
    });
});
