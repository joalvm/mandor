import { bridgeKitOf } from '@mandor/host/bridge-kit';
import { CHANNELS } from '@mandor/ipc';
import { createFakeBridge } from '@mandor/ipc/testing';
import { describe, expect, it } from 'vitest';

import { asyncBridgeOf } from '../../../src/preload/async-bridge.js';
import { spyBridgeIpc } from '@mandor/host/testing/bridge';

describe('the bridge the window of Async reaches', () => {
    it('keeps every area of the core as the host built it', () => {
        const core = createFakeBridge();
        const bridge = asyncBridgeOf(core, bridgeKitOf(spyBridgeIpc()));

        expect(bridge.collections).toBe(core.collections);
        expect(bridge.export.outline).toBe(core.export.outline);
        expect(bridge.export.write).toBe(core.export.write);
    });

    it('adds the areas only Async serves, each on its own channels', async () => {
        const ipc = spyBridgeIpc();
        const bridge = asyncBridgeOf(createFakeBridge(), bridgeKitOf(ipc));

        await bridge.ws.close({ connectionId: 'echo' });
        await bridge.connection.list({ workspaceId: 'ws' });
        await bridge.record.status({ connectionId: 'echo' });
        await bridge.export.jsonl({ suggestedName: 'echo.jsonl', records: [] });

        expect(ipc.calls.map(([channel]) => channel)).toEqual([
            CHANNELS.wsClose,
            CHANNELS.connectionList,
            CHANNELS.recordStatus,
            CHANNELS.exportJsonl,
        ]);
    });
});
