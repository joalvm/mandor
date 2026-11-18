import { bridgeKitOf } from '@mandor/host/bridge-kit';
import { CHANNELS } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { createConnectionBridge } from '../../../src/preload/connection-bridge.js';
import { REFUSED, spyBridgeIpc } from '@mandor/host/testing/bridge';

describe('the connection bridge of the preload', () => {
    it('sends every call to the channel that carries its name', async () => {
        const ipc = spyBridgeIpc();
        const bridge = createConnectionBridge(bridgeKitOf(ipc));

        await bridge.create({ workspaceId: 'ws', name: 'Echo', url: 'wss://example.com' });
        await bridge.list({ workspaceId: 'ws' });
        await bridge.update({
            workspaceId: 'ws',
            connectionId: 'echo',
            changes: { name: 'Echo 2' },
        });
        await bridge.delete({ workspaceId: 'ws', connectionId: 'echo' });

        expect(ipc.calls).toEqual([
            [
                CHANNELS.connectionCreate,
                { workspaceId: 'ws', name: 'Echo', url: 'wss://example.com' },
            ],
            [CHANNELS.connectionList, { workspaceId: 'ws' }],
            [
                CHANNELS.connectionUpdate,
                { workspaceId: 'ws', connectionId: 'echo', changes: { name: 'Echo 2' } },
            ],
            [CHANNELS.connectionDelete, { workspaceId: 'ws', connectionId: 'echo' }],
        ]);
    });

    /** The bridge adds no judgement of its own: the answer of main arrives whole. */
    it('hands back the answer of main untouched', async () => {
        await expect(
            createConnectionBridge(bridgeKitOf(spyBridgeIpc())).list({ workspaceId: 'ws' }),
        ).resolves.toEqual(REFUSED);
    });
});
